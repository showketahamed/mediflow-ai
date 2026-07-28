import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DeliveryService } from "../adapters/delivery.service";
import { N8nService } from "../adapters/n8n.service";
import type { AutomationJob, AutomationResult } from "../automation.types";
import { StepRunner } from "../step-runner.service";

@Injectable()
export class LabWorkflow {
  constructor(private readonly prisma: PrismaService, private readonly delivery: DeliveryService, private readonly n8n: N8nService, private readonly steps: StepRunner) {}
  async execute(job: AutomationJob, attempt: number): Promise<AutomationResult> {
    const order = await this.prisma.labOrder.findUnique({ where: { id: job.entityId }, include: { patient: true } });
    if (!order) throw new NotFoundException("Lab order not found.");
    const completed = job.eventName === "lab.result.ready";
    await this.steps.run(job.runId, "update-lab-status", attempt, () => this.prisma.labOrder.update({
      where: { id: order.id },
      data: completed ? { status: "COMPLETED", completedAt: new Date() } : { status: "SAMPLE_PENDING" },
    }));
    await this.steps.run(job.runId, "notify-lab", attempt, () => this.delivery.deliver({
      hospitalId: job.hospitalId,
      patientId: order.patientId,
      roles: [UserRole.LAB_TECHNICIAN, UserRole.DOCTOR],
      email: order.patient.email,
      phone: order.patient.phone,
      title: completed ? "Lab result ready" : "New lab order",
      body: `${order.testName} for ${order.patient.name} is ${completed ? "ready for review" : "awaiting sample collection"}.`,
      channels: completed ? ["IN_APP", "EMAIL", "SMS"] : ["IN_APP"],
      idempotencyKey: `${job.runId}-lab-delivery`,
    }));
    await this.steps.run(job.runId, "n8n-lab", attempt, () => this.n8n.trigger(job.eventName, { orderId: order.displayCode, patientId: order.patient.medicalId }));
    return { summary: `Lab automation completed for ${order.displayCode}.` };
  }
}
