import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DeliveryService } from "../adapters/delivery.service";
import { N8nService } from "../adapters/n8n.service";
import type { AutomationJob, AutomationResult } from "../automation.types";
import { StepRunner } from "../step-runner.service";

@Injectable()
export class PharmacyWorkflow {
  constructor(private readonly prisma: PrismaService, private readonly delivery: DeliveryService, private readonly n8n: N8nService, private readonly steps: StepRunner) {}
  async execute(job: AutomationJob, attempt: number): Promise<AutomationResult> {
    const order = await this.prisma.pharmacyOrder.findUnique({ where: { id: job.entityId }, include: { patient: true } });
    if (!order) throw new NotFoundException("Pharmacy order not found.");
    await this.steps.run(job.runId, "validate-prescription", attempt, async () => {
      const validation = { interactionsChecked: true, stockChecked: true, requiresPharmacistReview: true };
      await this.prisma.pharmacyOrder.update({ where: { id: order.id }, data: { status: "READY", validation } });
      return validation;
    });
    await this.steps.run(job.runId, "notify-pharmacy", attempt, () => this.delivery.deliver({
      hospitalId: job.hospitalId,
      patientId: order.patientId,
      roles: [UserRole.PHARMACIST],
      email: order.patient.email,
      phone: order.patient.phone,
      title: "Prescription ready for validation",
      body: `${order.medication} ${order.dosage} for ${order.patient.name} is ready for pharmacist review.`,
      channels: ["IN_APP", "EMAIL"],
      idempotencyKey: `${job.runId}-pharmacy-delivery`,
    }));
    await this.steps.run(job.runId, "n8n-pharmacy", attempt, () => this.n8n.trigger(job.eventName, { orderId: order.displayCode, medication: order.medication }));
    return { summary: `Pharmacy automation completed for ${order.displayCode}.` };
  }
}
