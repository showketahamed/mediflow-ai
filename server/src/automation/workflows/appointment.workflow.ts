import { Injectable, NotFoundException } from "@nestjs/common";
import type { AutomationJob, AutomationResult } from "../automation.types";
import { PrismaService } from "../../prisma/prisma.service";
import { DeliveryService } from "../adapters/delivery.service";
import { N8nService } from "../adapters/n8n.service";
import { StepRunner } from "../step-runner.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class AppointmentWorkflow {
  constructor(private readonly prisma: PrismaService, private readonly delivery: DeliveryService, private readonly n8n: N8nService, private readonly steps: StepRunner) {}

  async execute(job: AutomationJob, attempt: number): Promise<AutomationResult> {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: job.entityId }, include: { patient: true } });
    if (!appointment) throw new NotFoundException("Appointment automation target not found.");
    const reminder = job.eventName === "appointment.reminder";
    if (reminder && typeof job.payload.expectedStartsAt === "string" && appointment.startsAt.toISOString() !== job.payload.expectedStartsAt) {
      return { summary: "Stale appointment reminder skipped after rescheduling." };
    }
    const title = reminder ? "Appointment reminder" : job.eventName === "appointment.created" ? "Appointment confirmed" : "Appointment updated";
    const body = `${appointment.type} with ${appointment.doctorName} is scheduled for ${appointment.startsAt.toLocaleString()}.`;
    await this.steps.run(job.runId, "deliver-confirmation", attempt, () => this.delivery.deliver({
      hospitalId: job.hospitalId,
      patientId: appointment.patientId ?? undefined,
      email: appointment.patient?.email,
      phone: appointment.patient?.phone,
      title,
      body,
      channels: ["IN_APP", "EMAIL", "SMS"],
      idempotencyKey: `${job.runId}-appointment-delivery`,
    }));
    const n8n = await this.steps.run(job.runId, "n8n-appointment", attempt, () => this.n8n.trigger(job.eventName, {
      correlationId: job.correlationId,
      appointmentId: appointment.displayCode,
      patient: appointment.patientName,
      startsAt: appointment.startsAt.toISOString(),
      status: appointment.status,
    }));
    return { summary: `${title} automation completed.`, metadata: { n8n: (n8n ?? {}) as Prisma.JsonObject } };
  }
}
