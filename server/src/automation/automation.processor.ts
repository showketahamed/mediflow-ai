import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AutomationStatus, Prisma } from "@prisma/client";
import type { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { AUTOMATION_QUEUE, type AutomationJob } from "./automation.types";
import { WorkflowRouter } from "./workflow-router.service";

@Injectable()
@Processor(AUTOMATION_QUEUE, { concurrency: 10 })
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);
  constructor(private readonly prisma: PrismaService, private readonly router: WorkflowRouter, private readonly config: ConfigService) { super(); }

  async process(job: Job<AutomationJob>) {
    const attempt = job.attemptsMade + 1;
    await this.prisma.automationRun.update({
      where: { id: job.data.runId },
      data: { status: AutomationStatus.ACTIVE, attempt, startedAt: new Date(), nextRetryAt: null },
    });
    try {
      const result = await this.router.execute(job.data, attempt);
      await this.prisma.automationRun.update({
        where: { id: job.data.runId },
        data: { status: AutomationStatus.COMPLETED, result: result as unknown as Prisma.InputJsonValue, completedAt: new Date(), error: null },
      });
      return result;
    } catch (error) {
      const maxAttempts = Number(job.opts.attempts ?? 1);
      const final = attempt >= maxAttempts;
      const base = this.config.get<number>("AUTOMATION_BACKOFF_MS", 5000);
      await this.prisma.automationRun.update({
        where: { id: job.data.runId },
        data: {
          status: final ? AutomationStatus.DEAD_LETTER : AutomationStatus.RETRYING,
          error: error instanceof Error ? error.message : "Unknown workflow failure",
          completedAt: final ? new Date() : null,
          nextRetryAt: final ? null : new Date(Date.now() + base * 2 ** (attempt - 1)),
        },
      });
      throw error;
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<AutomationJob> | undefined, error: Error) {
    this.logger.error({ jobId: job?.id, runId: job?.data.runId, attemptsMade: job?.attemptsMade, error: error.message });
  }
}
