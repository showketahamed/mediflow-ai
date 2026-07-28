import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, type AutomationOutbox } from "@prisma/client";
import type { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { AUTOMATION_QUEUE, type AutomationJob } from "./automation.types";

@Injectable()
export class AutomationProducer {
  constructor(
    @InjectQueue(AUTOMATION_QUEUE) private readonly queue: Queue<AutomationJob>,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async dispatch(event: AutomationOutbox) {
    const maxAttempts = this.config.get<number>("AUTOMATION_MAX_ATTEMPTS", 5);
    let run = await this.prisma.automationRun.findUnique({
      where: { correlationId_eventName: { correlationId: event.correlationId, eventName: event.eventName } },
    });
    if (!run) {
      run = await this.prisma.automationRun.create({
        data: {
          hospitalId: event.hospitalId,
          type: event.type,
          eventName: event.eventName,
          correlationId: event.correlationId,
          entityType: event.entityType,
          entityId: event.entityId,
          payload: event.payload as Prisma.InputJsonValue,
          maxAttempts,
        },
      });
    }
    const data: AutomationJob = {
      runId: run.id,
      hospitalId: event.hospitalId,
      type: event.type,
      eventName: event.eventName,
      correlationId: event.correlationId,
      entityType: event.entityType ?? undefined,
      entityId: event.entityId ?? undefined,
      payload: event.payload as AutomationJob["payload"],
    };
    const job = await this.queue.add(event.eventName, data, {
      jobId: run.id,
      delay: event.delayMs,
      priority: event.priority,
      attempts: maxAttempts,
      backoff: { type: "exponential", delay: this.config.get<number>("AUTOMATION_BACKOFF_MS", 5000) },
      removeOnComplete: { age: 86_400, count: 1000 },
      removeOnFail: false,
    });
    await this.prisma.automationRun.update({ where: { id: run.id }, data: { bullJobId: job.id } });
    return run.id;
  }

  async retry(runId: string) {
    const run = await this.prisma.automationRun.findUniqueOrThrow({ where: { id: runId } });
    const existing = await this.queue.getJob(run.bullJobId ?? run.id);
    if (existing) await existing.remove();
    await this.prisma.automationRun.update({
      where: { id: runId },
      data: { status: "QUEUED", attempt: 0, error: null, completedAt: null, nextRetryAt: null },
    });
    const event = {
      id: run.id,
      hospitalId: run.hospitalId,
      type: run.type,
      eventName: run.eventName,
      correlationId: run.correlationId,
      entityType: run.entityType,
      entityId: run.entityId,
      payload: run.payload,
      priority: 5,
      delayMs: 0,
    } as AutomationOutbox;
    return this.dispatch(event);
  }

  getQueue() {
    return this.queue;
  }
}
