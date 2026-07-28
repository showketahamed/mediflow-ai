import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AutomationStatus, AutomationType, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { CurrentUser } from "../common/current-user.decorator";
import { RequirePermissions } from "../common/permissions.decorator";
import { Public } from "../common/public.decorator";
import type { AuthUser } from "../common/types";
import { PrismaService } from "../prisma/prisma.service";
import { N8nService } from "./adapters/n8n.service";
import { DispatchAutomationDto, ListAutomationRunsDto } from "./automation.dto";
import { AutomationProducer } from "./automation.producer";
import { OutboxService } from "./outbox.service";

@ApiTags("Automation")
@ApiBearerAuth()
@Controller("automations")
export class AutomationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly producer: AutomationProducer,
    private readonly n8n: N8nService,
  ) {}

  @Post("dispatch")
  @RequirePermissions("automations:dispatch")
  async dispatch(@CurrentUser() user: AuthUser, @Body() dto: DispatchAutomationDto) {
    const event = await this.outbox.enqueue({
      hospitalId: user.hospitalId!,
      type: dto.type,
      eventName: dto.eventName,
      correlationId: randomUUID(),
      entityType: dto.entityType,
      entityId: dto.entityId,
      payload: dto.payload as Prisma.InputJsonObject,
      priority: dto.priority,
      delayMs: dto.delayMs,
    });
    return { outboxId: event.id, status: event.status };
  }

  @Get("monitor")
  @RequirePermissions("automations:monitor")
  async monitor(@CurrentUser() user: AuthUser) {
    const queue = this.producer.getQueue();
    const [queueCounts, statusGroups, recent, outboxPending] = await Promise.all([
      queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
      this.prisma.automationRun.groupBy({ by: ["status"], where: { hospitalId: user.hospitalId! }, _count: { _all: true } }),
      this.prisma.automationRun.findMany({
        where: { hospitalId: user.hospitalId! },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, eventName: true, status: true, attempt: true, error: true, createdAt: true, completedAt: true },
      }),
      this.prisma.automationOutbox.count({ where: { hospitalId: user.hospitalId!, status: { in: ["PENDING", "FAILED", "PROCESSING"] } } }),
    ]);
    const statuses = Object.fromEntries(statusGroups.map((item) => [item.status.toLowerCase(), item._count._all]));
    const terminal = (statuses.completed ?? 0) + (statuses.dead_letter ?? 0);
    return {
      redis: queueCounts,
      database: statuses,
      outboxPending,
      successRate: terminal ? Math.round(((statuses.completed ?? 0) / terminal) * 1000) / 10 : 100,
      recent,
      checkedAt: new Date().toISOString(),
    };
  }

  @Get("runs")
  @RequirePermissions("automations:monitor")
  list(@CurrentUser() user: AuthUser, @Query() query: ListAutomationRunsDto) {
    return this.prisma.automationRun.findMany({
      where: { hospitalId: user.hospitalId!, status: query.status, type: query.type },
      include: { steps: { orderBy: { startedAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Get("runs/:id")
  @RequirePermissions("automations:monitor")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.prisma.automationRun.findFirstOrThrow({ where: { id, hospitalId: user.hospitalId! }, include: { steps: { orderBy: { startedAt: "asc" } } } });
  }

  @Post("runs/:id/retry")
  @RequirePermissions("automations:retry")
  async retry(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const run = await this.prisma.automationRun.findFirstOrThrow({ where: { id, hospitalId: user.hospitalId! } });
    if (run.status !== AutomationStatus.DEAD_LETTER && run.status !== AutomationStatus.FAILED && run.status !== AutomationStatus.CANCELLED) {
      throw new BadRequestException("Only failed, cancelled, or dead-letter automations can be retried.");
    }
    await this.producer.retry(id);
    return { id, status: "QUEUED" };
  }

  @Public()
  @Post("n8n/callback")
  async callback(@Headers("x-n8n-secret") secret: string | undefined, @Body() body: Record<string, unknown>) {
    this.n8n.verifyCallback(secret);
    const correlationId = String(body.correlationId ?? "");
    if (correlationId) {
      await this.prisma.automationRun.updateMany({
        where: { correlationId },
        data: { n8nExecutionId: typeof body.executionId === "string" ? body.executionId : undefined },
      });
    }
    return { accepted: true };
  }
}
