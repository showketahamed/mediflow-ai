import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DeliveryService } from "../adapters/delivery.service";
import { N8nService } from "../adapters/n8n.service";
import type { AutomationJob, AutomationResult } from "../automation.types";
import { StepRunner } from "../step-runner.service";

@Injectable()
export class BedWorkflow {
  constructor(private readonly prisma: PrismaService, private readonly delivery: DeliveryService, private readonly n8n: N8nService, private readonly steps: StepRunner) {}
  async execute(job: AutomationJob, attempt: number): Promise<AutomationResult> {
    const admissionId = String(job.payload.admissionId ?? "");
    const admission = await this.prisma.admission.findUnique({ where: { id: admissionId }, include: { patient: true } });
    if (!admission) throw new NotFoundException("Admission not found for bed allocation.");
    const allocation = await this.steps.run(job.runId, "allocate-bed", attempt, async () => {
      const existing = await this.prisma.bedAllocation.findFirst({ where: { admissionId, releasedAt: null }, include: { bed: true } });
      if (existing) return { allocationId: existing.id, bedCode: existing.bed.code };
      return this.prisma.$transaction(async (tx) => {
        const bed = await tx.bed.findFirst({
          where: { hospitalId: job.hospitalId, status: "AVAILABLE", type: job.payload.bedType ? String(job.payload.bedType) : undefined },
          orderBy: { code: "asc" },
        });
        if (!bed) throw new Error("No compatible bed is currently available.");
        const claimed = await tx.bed.updateMany({ where: { id: bed.id, status: "AVAILABLE" }, data: { status: "OCCUPIED" } });
        if (!claimed.count) throw new Error("Bed was claimed concurrently; retrying allocation.");
        const created = await tx.bedAllocation.create({ data: { bedId: bed.id, admissionId } });
        await tx.admission.update({ where: { id: admissionId }, data: { wardId: bed.wardId } });
        return { allocationId: created.id, bedCode: bed.code };
      });
    });
    await this.steps.run(job.runId, "notify-bed-allocation", attempt, () => this.delivery.deliver({
      hospitalId: job.hospitalId,
      roles: [UserRole.NURSE, UserRole.RECEPTIONIST, UserRole.HOSPITAL_ADMIN],
      patientId: admission.patientId,
      title: "Bed allocated",
      body: `${admission.patient.name} has been allocated bed ${allocation?.bedCode}.`,
      channels: ["IN_APP"],
      idempotencyKey: `${job.runId}-bed-delivery`,
    }));
    await this.steps.run(job.runId, "n8n-bed-allocation", attempt, () => this.n8n.trigger(job.eventName, { admissionId, ...allocation }));
    return { summary: `Bed ${allocation?.bedCode} allocated.`, metadata: allocation ?? {} };
  }
}
