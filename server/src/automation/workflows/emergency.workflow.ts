import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DeliveryService } from "../adapters/delivery.service";
import { N8nService } from "../adapters/n8n.service";
import type { AutomationJob, AutomationResult } from "../automation.types";
import { StepRunner } from "../step-runner.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class EmergencyWorkflow {
  constructor(private readonly prisma: PrismaService, private readonly delivery: DeliveryService, private readonly n8n: N8nService, private readonly steps: StepRunner) {}
  async execute(job: AutomationJob, attempt: number): Promise<AutomationResult> {
    const emergency = await this.prisma.emergencyCase.findUnique({ where: { id: job.entityId }, include: { patient: true } });
    if (!emergency) throw new NotFoundException("Emergency case not found.");
    await this.steps.run(job.runId, "activate-response", attempt, () => this.prisma.emergencyCase.update({
      where: { id: emergency.id },
      data: { status: "RESPONDING", response: { activatedAt: new Date().toISOString(), severity: emergency.severity } },
    }));
    await this.steps.run(job.runId, "notify-emergency-team", attempt, () => this.delivery.deliver({
      hospitalId: job.hospitalId,
      roles: [UserRole.DOCTOR, UserRole.NURSE, UserRole.HOSPITAL_ADMIN],
      title: `Emergency ${emergency.displayCode}: severity ${emergency.severity}`,
      body: `${emergency.description}${emergency.location ? ` at ${emergency.location}` : ""}. Immediate response required.`,
      channels: ["IN_APP"],
      idempotencyKey: `${job.runId}-emergency-delivery`,
    }));
    const n8n = await this.steps.run(job.runId, "n8n-emergency", attempt, () => this.n8n.trigger(job.eventName, {
      caseId: emergency.displayCode,
      severity: emergency.severity,
      description: emergency.description,
      location: emergency.location,
    }));
    return { summary: `Emergency response activated for ${emergency.displayCode}.`, metadata: { n8n: (n8n ?? {}) as Prisma.JsonObject } };
  }
}
