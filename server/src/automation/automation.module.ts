import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { DeliveryService } from "./adapters/delivery.service";
import { EmailService } from "./adapters/email.service";
import { N8nService } from "./adapters/n8n.service";
import { SmsService } from "./adapters/sms.service";
import { AutomationController } from "./automation.controller";
import { AutomationProcessor } from "./automation.processor";
import { AutomationProducer } from "./automation.producer";
import { AUTOMATION_QUEUE } from "./automation.types";
import { BedsController } from "./domains/beds.controller";
import { EmergencyController } from "./domains/emergency.controller";
import { FollowUpController } from "./domains/follow-up.controller";
import { LabController } from "./domains/lab.controller";
import { PharmacyController } from "./domains/pharmacy.controller";
import { OutboxService } from "./outbox.service";
import { StepRunner } from "./step-runner.service";
import { WorkflowRouter } from "./workflow-router.service";
import { AppointmentWorkflow } from "./workflows/appointment.workflow";
import { BedWorkflow } from "./workflows/bed.workflow";
import { EmergencyWorkflow } from "./workflows/emergency.workflow";
import { FollowUpWorkflow } from "./workflows/follow-up.workflow";
import { LabWorkflow } from "./workflows/lab.workflow";
import { NotificationWorkflow } from "./workflows/notification.workflow";
import { PharmacyWorkflow } from "./workflows/pharmacy.workflow";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get("REDIS_HOST", "localhost"),
          port: config.get<number>("REDIS_PORT", 6379),
          password: config.get<string>("REDIS_PASSWORD"),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      }),
    }),
    BullModule.registerQueue({ name: AUTOMATION_QUEUE }),
  ],
  controllers: [
    AutomationController,
    LabController,
    PharmacyController,
    BedsController,
    EmergencyController,
    FollowUpController,
  ],
  providers: [
    AutomationProducer,
    AutomationProcessor,
    OutboxService,
    StepRunner,
    WorkflowRouter,
    EmailService,
    SmsService,
    N8nService,
    DeliveryService,
    AppointmentWorkflow,
    LabWorkflow,
    PharmacyWorkflow,
    BedWorkflow,
    EmergencyWorkflow,
    FollowUpWorkflow,
    NotificationWorkflow,
  ],
  exports: [OutboxService],
})
export class AutomationModule {}
