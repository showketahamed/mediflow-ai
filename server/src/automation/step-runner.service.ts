import { Injectable } from "@nestjs/common";
import { AutomationStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StepRunner {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(runId: string, step: string, attempt: number, task: () => Promise<T>): Promise<T | undefined> {
    const completed = await this.prisma.automationStepLog.findFirst({
      where: { runId, step, status: AutomationStatus.COMPLETED },
      orderBy: { completedAt: "desc" },
    });
    if (completed) return completed.metadata as T | undefined;
    const log = await this.prisma.automationStepLog.create({
      data: { runId, step, attempt, status: AutomationStatus.ACTIVE },
    });
    try {
      const result = await task();
      await this.prisma.automationStepLog.update({
        where: { id: log.id },
        data: {
          status: AutomationStatus.COMPLETED,
          completedAt: new Date(),
          metadata: (result ?? {}) as Prisma.InputJsonValue,
        },
      });
      return result;
    } catch (error) {
      await this.prisma.automationStepLog.update({
        where: { id: log.id },
        data: {
          status: AutomationStatus.FAILED,
          completedAt: new Date(),
          message: error instanceof Error ? error.message : "Unknown step failure",
        },
      });
      throw error;
    }
  }
}
