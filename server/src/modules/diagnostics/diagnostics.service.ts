import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import type { UpsertDiagnosticDto } from "./diagnostics.dto";

@Injectable()
export class DiagnosticsService {
  constructor(private readonly prisma: PrismaService) {}
  private hospitalId(user: AuthUser) {
    if (!user.hospitalId) throw new ForbiddenException("A hospital assignment is required.");
    return user.hospitalId;
  }
  private map(row: any) {
    return {
      id: row.displayCode,
      patientId: row.patient.medicalId,
      patientName: row.patient.name,
      scanType: row.scanType,
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      status: row.status.toLowerCase(),
      progress: row.progress,
      summary: row.summary,
      findings: row.findings.map((item: any) => item.description),
      recommendation: row.recommendation,
    };
  }
  async list(user: AuthUser) {
    const patient = user.role === UserRole.PATIENT ? await this.prisma.patient.findUnique({ where: { userId: user.sub } }) : null;
    const rows = await this.prisma.diagnostic.findMany({
      where: { hospitalId: this.hospitalId(user), patientId: user.role === UserRole.PATIENT ? patient?.id ?? "__none__" : undefined },
      include: { patient: true, findings: { orderBy: { sortOrder: "asc" } } },
      orderBy: { startedAt: "desc" },
    });
    return rows.map((row) => this.map(row));
  }
  async upsert(user: AuthUser, dto: UpsertDiagnosticDto) {
    const hospitalId = this.hospitalId(user);
    const patient = await this.prisma.patient.findFirst({ where: { hospitalId, medicalId: dto.patientId } });
    if (!patient) throw new NotFoundException("Patient not found.");
    const existing = await this.prisma.diagnostic.findFirst({ where: { hospitalId, displayCode: dto.displayCode } });
    const data = {
      hospitalId,
      patientId: patient.id,
      displayCode: dto.displayCode,
      scanType: dto.scanType,
      startedAt: new Date(dto.startedAt),
      completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
      status: dto.status,
      progress: dto.progress,
      summary: dto.summary,
      recommendation: dto.recommendation,
    };
    const row = await this.prisma.$transaction(async (tx) => {
      const diagnostic = existing
        ? await tx.diagnostic.update({ where: { id: existing.id }, data })
        : await tx.diagnostic.create({ data });
      await tx.diagnosticFinding.deleteMany({ where: { diagnosticId: diagnostic.id } });
      if (dto.findings.length) {
        await tx.diagnosticFinding.createMany({
          data: dto.findings.map((description, sortOrder) => ({ diagnosticId: diagnostic.id, description, sortOrder })),
        });
      }
      return tx.diagnostic.findUniqueOrThrow({
        where: { id: diagnostic.id },
        include: { patient: true, findings: { orderBy: { sortOrder: "asc" } } },
      });
    });
    return this.map(row);
  }
}
