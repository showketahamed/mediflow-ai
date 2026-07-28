import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AiFeature, AiMessageRole, UserRole } from "@prisma/client";
import { createHash } from "crypto";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  AiAnalyticsDto,
  AppointmentAssistantDto,
  ChatDto,
  DiagnosisSuggestionDto,
  ReportSummaryDto,
} from "./ai.dto";
import { PROMPT_VERSION, prompts } from "./ai.prompts";
import {
  aiAnalyticsSchema,
  appointmentAssistantSchema,
  assistantSchema,
  diagnosisSuggestionSchema,
  ocrSchema,
  patientSummarySchema,
  predictionSchema,
  reportSummarySchema,
  voiceNoteSchema,
} from "./ai.schemas";
import { AI_PROVIDER, type AiProvider, type AiProviderResult } from "./providers/ai-provider.interface";

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  private requireHospital(user: AuthUser) {
    if (!user.hospitalId) throw new ForbiddenException("A hospital assignment is required.");
    return user.hospitalId;
  }

  private serialize(value: unknown) {
    return JSON.stringify(value, (_key, item) => item instanceof Date ? item.toISOString() : item);
  }

  private async run<T>(
    user: AuthUser,
    feature: AiFeature,
    hashInput: unknown,
    operation: () => Promise<AiProviderResult<T>>,
    metadata: Record<string, string | number | boolean | null> = {},
  ) {
    const started = Date.now();
    const inputHash = createHash("sha256").update(this.serialize(hashInput)).digest("hex");
    try {
      const result = await operation();
      await this.prisma.aiInteraction.create({
        data: {
          hospitalId: user.hospitalId,
          userId: user.sub,
          feature,
          status: result.demo ? "DEMO" : "SUCCESS",
          provider: result.provider,
          model: result.model,
          promptVersion: PROMPT_VERSION,
          inputHash,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          latencyMs: Date.now() - started,
          metadata,
        },
      });
      return {
        ...result.data as T & object,
        meta: {
          provider: result.provider,
          model: result.model,
          demo: result.demo,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorCode = error instanceof Error ? error.constructor.name : "UnknownError";
      await this.prisma.aiInteraction.create({
        data: {
          hospitalId: user.hospitalId,
          userId: user.sub,
          feature,
          status: "FAILED",
          provider: this.provider.name,
          model: this.provider.model,
          promptVersion: PROMPT_VERSION,
          inputHash,
          latencyMs: Date.now() - started,
          errorCode,
          metadata,
        },
      }).catch(() => undefined);
      if (error instanceof ForbiddenException || error instanceof NotFoundException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException("The AI request could not be completed. Please retry shortly.");
    }
  }

  private async patientContext(user: AuthUser, medicalId: string) {
    const hospitalId = this.requireHospital(user);
    const patient = await this.prisma.patient.findFirst({
      where: { hospitalId, medicalId },
      include: {
        admissions: {
          orderBy: { admittedAt: "desc" },
          take: 3,
          include: {
            ward: { select: { name: true } },
            vitals: { orderBy: { recordedAt: "desc" }, take: 5 },
          },
        },
        appointments: { orderBy: { startsAt: "desc" }, take: 8 },
        diagnostics: { orderBy: { startedAt: "desc" }, take: 8, include: { findings: true } },
        labOrders: { orderBy: { orderedAt: "desc" }, take: 8 },
        pharmacyOrders: { orderBy: { orderedAt: "desc" }, take: 8 },
        followUps: { orderBy: { scheduledAt: "desc" }, take: 8 },
      },
    });
    if (!patient) throw new NotFoundException("Patient not found.");
    if (user.role === UserRole.PATIENT && patient.userId !== user.sub) {
      throw new ForbiddenException("Patients may only access their own record.");
    }
    return patient;
  }

  async assistant(user: AuthUser, dto: ChatDto, receptionist: boolean) {
    const feature = receptionist ? AiFeature.RECEPTIONIST : AiFeature.CHAT;
    let conversation = dto.conversationId
      ? await this.prisma.aiConversation.findFirst({ where: { id: dto.conversationId, userId: user.sub } })
      : null;
    if (dto.conversationId && !conversation) throw new NotFoundException("Conversation not found.");
    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: {
          userId: user.sub,
          hospitalId: user.hospitalId,
          title: dto.message.replace(/\s+/g, " ").slice(0, 80),
        },
      });
    }
    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const context = history.reverse().map((item) => `${item.role}: ${item.content}`).join("\n");
    const result = await this.run(
      user,
      feature,
      { message: dto.message, conversationId: conversation.id },
      () => this.provider.structured({
        schema: assistantSchema,
        schemaName: "assistant_response",
        system: receptionist ? prompts.receptionist : prompts.chat,
        user: `Recent conversation:\n${context || "None"}\n\nNew message:\n${dto.message}`,
      }),
      { conversationId: conversation.id },
    );
    await this.prisma.$transaction([
      this.prisma.aiMessage.create({
        data: { conversationId: conversation.id, role: AiMessageRole.USER, content: dto.message },
      }),
      this.prisma.aiMessage.create({
        data: { conversationId: conversation.id, role: AiMessageRole.ASSISTANT, content: result.answer },
      }),
    ]);
    return { ...result, conversationId: conversation.id };
  }

  async patientSummary(user: AuthUser, medicalId: string) {
    const patient = await this.patientContext(user, medicalId);
    return this.run(
      user,
      AiFeature.PATIENT_SUMMARY,
      { medicalId, updatedAt: patient.updatedAt },
      () => this.provider.structured({
        schema: patientSummarySchema,
        schemaName: "patient_summary",
        system: prompts.patientSummary,
        user: `Summarize this patient record:\n${this.serialize(patient)}`,
      }),
      { patientId: patient.id },
    );
  }

  async appointmentAssistant(user: AuthUser, dto: AppointmentAssistantDto) {
    const hospitalId = this.requireHospital(user);
    if (user.role === UserRole.PATIENT && dto.patientId) await this.patientContext(user, dto.patientId);
    const start = new Date();
    const end = new Date(Date.now() + 14 * 86_400_000);
    const [appointments, doctors] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { hospitalId, startsAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
        select: { doctorName: true, room: true, startsAt: true, endsAt: true, type: true },
        orderBy: { startsAt: "asc" },
      }),
      this.prisma.user.findMany({
        where: { hospitalId, role: UserRole.DOCTOR, active: true },
        select: { name: true, title: true },
      }),
    ]);
    return this.run(
      user,
      AiFeature.APPOINTMENT_ASSISTANT,
      dto,
      () => this.provider.structured({
        schema: appointmentAssistantSchema,
        schemaName: "appointment_assistant",
        system: prompts.appointment,
        user: `Request: ${dto.request}\nDoctors: ${this.serialize(doctors)}\nExisting schedule (use only to avoid conflicts): ${this.serialize(appointments)}`,
      }),
      { scheduleWindowDays: 14 },
    );
  }

  async diagnosisSuggestions(user: AuthUser, dto: DiagnosisSuggestionDto) {
    const patient = await this.patientContext(user, dto.patientId);
    return this.run(
      user,
      AiFeature.DIAGNOSIS_SUGGESTION,
      dto,
      () => this.provider.structured({
        schema: diagnosisSuggestionSchema,
        schemaName: "diagnosis_suggestion",
        system: prompts.diagnosis,
        user: `Symptoms: ${dto.symptoms}\nAdditional context: ${dto.clinicalContext || "None"}\nPatient record: ${this.serialize(patient)}`,
      }),
      { patientId: patient.id, demoFeature: true },
    );
  }

  async medicalOcr(user: AuthUser, file: Express.Multer.File) {
    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    return this.run(
      user,
      AiFeature.MEDICAL_OCR,
      { fileHash, mimeType: file.mimetype, size: file.size },
      () => this.provider.structured({
        schema: ocrSchema,
        schemaName: "medical_ocr",
        system: prompts.ocr,
        user: "Extract all readable medical text and structured fields from this image.",
        image: { buffer: file.buffer, mimeType: file.mimetype },
      }),
      { mimeType: file.mimetype, bytes: file.size },
    );
  }

  async voiceNote(user: AuthUser, file: Express.Multer.File) {
    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    return this.run(
      user,
      AiFeature.VOICE_NOTE,
      { fileHash, mimeType: file.mimetype, size: file.size },
      async () => {
        const transcription = await this.provider.transcribe(file);
        const note = await this.provider.structured({
          schema: voiceNoteSchema,
          schemaName: "voice_note",
          system: prompts.voice,
          user: `Transcript:\n${transcription.data}`,
        });
        note.data.transcript = transcription.data;
        return note;
      },
      { mimeType: file.mimetype, bytes: file.size },
    );
  }

  async reportSummary(user: AuthUser, dto: ReportSummaryDto) {
    return this.run(
      user,
      AiFeature.REPORT_SUMMARY,
      dto,
      () => this.provider.structured({
        schema: reportSummarySchema,
        schemaName: "report_summary",
        system: prompts.report,
        user: `Medical report:\n${dto.report}`,
      }),
    );
  }

  private async aggregateContext(user: AuthUser, range: "7d" | "30d" | "90d") {
    const hospitalId = this.requireHospital(user);
    const days = Number.parseInt(range, 10);
    const since = new Date(Date.now() - days * 86_400_000);
    const [
      patients,
      admissions,
      discharged,
      appointments,
      completedAppointments,
      diagnostics,
      openEmergencies,
      availableBeds,
      occupiedBeds,
    ] = await Promise.all([
      this.prisma.patient.count({ where: { hospitalId } }),
      this.prisma.admission.count({ where: { patient: { hospitalId }, admittedAt: { gte: since } } }),
      this.prisma.admission.count({ where: { patient: { hospitalId }, dischargedAt: { gte: since } } }),
      this.prisma.appointment.count({ where: { hospitalId, startsAt: { gte: since } } }),
      this.prisma.appointment.count({ where: { hospitalId, startsAt: { gte: since }, status: "COMPLETED" } }),
      this.prisma.diagnostic.count({ where: { hospitalId, startedAt: { gte: since } } }),
      this.prisma.emergencyCase.count({ where: { hospitalId, status: { notIn: ["CLOSED", "STABILIZED"] } } }),
      this.prisma.bed.count({ where: { hospitalId, status: "AVAILABLE" } }),
      this.prisma.bed.count({ where: { hospitalId, status: "OCCUPIED" } }),
    ]);
    return {
      range,
      patients,
      admissions,
      discharged,
      appointments,
      completedAppointments,
      completionRate: appointments ? Math.round(completedAppointments / appointments * 1000) / 10 : 0,
      diagnostics,
      openEmergencies,
      availableBeds,
      occupiedBeds,
    };
  }

  async analytics(user: AuthUser, dto: AiAnalyticsDto) {
    const context = await this.aggregateContext(user, dto.range);
    return this.run(
      user,
      AiFeature.ANALYTICS,
      context,
      () => this.provider.structured({
        schema: aiAnalyticsSchema,
        schemaName: "ai_analytics",
        system: prompts.analytics,
        user: `Aggregate operational metrics:\n${this.serialize(context)}`,
      }),
      { range: dto.range },
    );
  }

  async predictions(user: AuthUser, dto: AiAnalyticsDto) {
    const context = await this.aggregateContext(user, dto.range);
    return this.run(
      user,
      AiFeature.PREDICTION,
      context,
      () => this.provider.structured({
        schema: predictionSchema,
        schemaName: "prediction_dashboard",
        system: prompts.prediction,
        user: `Create a cautious seven-day operational forecast from these aggregate metrics:\n${this.serialize(context)}`,
      }),
      { range: dto.range, horizonDays: 7 },
    );
  }

  async usage(user: AuthUser) {
    const hospitalId = this.requireHospital(user);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [byFeature, byStatus, recent] = await Promise.all([
      this.prisma.aiInteraction.groupBy({
        by: ["feature"],
        where: { hospitalId, createdAt: { gte: since } },
        _count: true,
        _avg: { latencyMs: true },
      }),
      this.prisma.aiInteraction.groupBy({
        by: ["status"],
        where: { hospitalId, createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.aiInteraction.findMany({
        where: { hospitalId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          feature: true,
          status: true,
          provider: true,
          model: true,
          latencyMs: true,
          createdAt: true,
        },
      }),
    ]);
    return { byFeature, byStatus, recent, range: "30d" };
  }
}

