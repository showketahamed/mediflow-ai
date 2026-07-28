import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AutomationProducer } from "./automation.producer";
import type { OutboxEventInput } from "./automation.types";

@Injectable()
export class OutboxService implements OnModuleInit {
  private readonly logger = new Logger(OutboxService.name);
  private relaying = false;
  constructor(private readonly prisma: PrismaService, private readonly producer: AutomationProducer) {}

  async onModuleInit() {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    await this.prisma.automationOutbox.updateMany({
      where: { status: "PROCESSING", lockedAt: { lt: staleBefore } },
      data: { status: "FAILED", lockedAt: null, lastError: "Recovered stale outbox lease." },
    });
  }

  enqueue(input: Omit<OutboxEventInput, "correlationId"> & { correlationId?: string }) {
    return this.prisma.automationOutbox.create({
      data: {
        ...input,
        correlationId: input.correlationId ?? randomUUID(),
        payload: input.payload as Prisma.InputJsonValue,
        availableAt: new Date(),
      },
    });
  }

  @Interval(2000)
  async relay() {
    if (this.relaying) return;
    this.relaying = true;
    try {
      const events = await this.prisma.automationOutbox.findMany({
        where: { status: { in: ["PENDING", "FAILED"] }, availableAt: { lte: new Date() }, attempts: { lt: 20 } },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: 50,
      });
      for (const event of events) {
        const claimed = await this.prisma.automationOutbox.updateMany({
          where: { id: event.id, status: event.status },
          data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } },
        });
        if (!claimed.count) continue;
        try {
          await this.producer.dispatch(event);
          await this.prisma.automationOutbox.update({
            where: { id: event.id },
            data: { status: "PROCESSED", processedAt: new Date(), lockedAt: null, lastError: null },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown outbox dispatch failure";
          const backoff = Math.min(300_000, 1000 * 2 ** Math.min(event.attempts, 8));
          await this.prisma.automationOutbox.update({
            where: { id: event.id },
            data: { status: "FAILED", lockedAt: null, lastError: message, availableAt: new Date(Date.now() + backoff) },
          });
          this.logger.error(`Outbox event ${event.id} failed: ${message}`);
        }
      }
    } finally {
      this.relaying = false;
    }
  }
}
