import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DeliveryService } from "../adapters/delivery.service";
import { N8nService } from "../adapters/n8n.service";
import type { AutomationJob, AutomationResult } from "../automation.types";
import { StepRunner } from "../step-runner.service";

@Injectable()
export class FollowUpWorkflow {
  constructor(private readonly prisma: PrismaService, private readonly delivery: DeliveryService, private readonly n8n: N8nService, private readonly steps: StepRunner) {}
  async execute(job: AutomationJob, attempt: number): Promise<AutomationResult> {
    const followUp = await this.prisma.followUp.findUnique({ where: { id: job.entityId }, include: { patient: true } });
    if (!followUp) throw new NotFoundException("Follow-up not found.");
    const channels = followUp.channel === "SMS" ? ["IN_APP", "SMS"] as const : followUp.channel === "EMAIL" ? ["IN_APP", "EMAIL"] as const : ["IN_APP"] as const;
    await this.steps.run(job.runId, "deliver-follow-up", attempt, () => this.delivery.deliver({
      hospitalId: job.hospitalId,
      patientId: followUp.patientId,
      email: followUp.patient.email,
      phone: followUp.patient.phone,
      title: "Care follow-up",
      body: `${followUp.reason}. Please contact your care team if you need assistance.`,
      channels: [...channels],
      idempotencyKey: `${job.runId}-follow-up-delivery`,
    }));
    await this.steps.run(job.runId, "mark-follow-up-sent", attempt, () => this.prisma.followUp.update({ where: { id: followUp.id }, data: { status: "SENT", sentAt: new Date() } }));
    await this.steps.run(job.runId, "n8n-follow-up", attempt, () => this.n8n.trigger(job.eventName, { followUpId: followUp.id, patientId: followUp.patient.medicalId }));
    return { summary: `Follow-up sent to ${followUp.patient.name}.` };
  }
}
