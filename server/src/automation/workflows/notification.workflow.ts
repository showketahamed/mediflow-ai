import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { DeliveryService } from "../adapters/delivery.service";
import { N8nService } from "../adapters/n8n.service";
import type { AutomationJob, AutomationResult } from "../automation.types";
import { StepRunner } from "../step-runner.service";

@Injectable()
export class NotificationWorkflow {
  constructor(private readonly delivery: DeliveryService, private readonly n8n: N8nService, private readonly steps: StepRunner) {}
  async execute(job: AutomationJob, attempt: number): Promise<AutomationResult> {
    const title = String(job.payload.title ?? "MediFlow notification");
    const body = String(job.payload.body ?? "");
    const roleNames = Array.isArray(job.payload.roles) ? job.payload.roles.map(String) : [];
    const roles = roleNames.filter((role): role is UserRole => Object.values(UserRole).includes(role as UserRole));
    await this.steps.run(job.runId, "deliver-notification", attempt, () => this.delivery.deliver({
      hospitalId: job.hospitalId,
      patientId: typeof job.payload.patientId === "string" ? job.payload.patientId : undefined,
      roles,
      email: typeof job.payload.email === "string" ? job.payload.email : undefined,
      phone: typeof job.payload.phone === "string" ? job.payload.phone : undefined,
      title,
      body,
      channels: ["IN_APP", "EMAIL", "SMS"],
      idempotencyKey: `${job.runId}-notification-delivery`,
    }));
    if (job.type === "N8N") await this.steps.run(job.runId, "n8n-generic", attempt, () => this.n8n.trigger(job.eventName, job.payload));
    return { summary: "Notification automation completed." };
  }
}
