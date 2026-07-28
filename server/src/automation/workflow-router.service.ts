import { Injectable } from "@nestjs/common";
import type { AutomationJob, AutomationResult } from "./automation.types";
import { AppointmentWorkflow } from "./workflows/appointment.workflow";
import { BedWorkflow } from "./workflows/bed.workflow";
import { EmergencyWorkflow } from "./workflows/emergency.workflow";
import { FollowUpWorkflow } from "./workflows/follow-up.workflow";
import { LabWorkflow } from "./workflows/lab.workflow";
import { NotificationWorkflow } from "./workflows/notification.workflow";
import { PharmacyWorkflow } from "./workflows/pharmacy.workflow";

@Injectable()
export class WorkflowRouter {
  constructor(
    private readonly appointment: AppointmentWorkflow,
    private readonly lab: LabWorkflow,
    private readonly pharmacy: PharmacyWorkflow,
    private readonly bed: BedWorkflow,
    private readonly emergency: EmergencyWorkflow,
    private readonly followUp: FollowUpWorkflow,
    private readonly notification: NotificationWorkflow,
  ) {}

  execute(job: AutomationJob, attempt: number): Promise<AutomationResult> {
    switch (job.type) {
      case "APPOINTMENT": return this.appointment.execute(job, attempt);
      case "LAB": return this.lab.execute(job, attempt);
      case "PHARMACY": return this.pharmacy.execute(job, attempt);
      case "BED_ALLOCATION": return this.bed.execute(job, attempt);
      case "EMERGENCY": return this.emergency.execute(job, attempt);
      case "FOLLOW_UP": return this.followUp.execute(job, attempt);
      case "NOTIFICATION":
      case "N8N": return this.notification.execute(job, attempt);
      default: throw new Error(`No workflow registered for automation type ${String(job.type)}.`);
    }
  }
}
