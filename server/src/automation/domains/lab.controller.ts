import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import { CompleteLabOrderDto, CreateLabOrderDto } from "./domain.dto";

@ApiTags("Lab Automation")
@ApiBearerAuth()
@Controller("lab/orders")
export class LabController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermissions("lab:read")
  list(@CurrentUser() user: AuthUser) { return this.prisma.labOrder.findMany({ where: { hospitalId: user.hospitalId! }, include: { patient: true }, orderBy: { orderedAt: "desc" } }); }
  @Post() @RequirePermissions("lab:create")
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateLabOrderDto) {
    const patient = await this.prisma.patient.findFirstOrThrow({ where: { hospitalId: user.hospitalId!, medicalId: dto.patientId } });
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.labOrder.create({ data: { hospitalId: user.hospitalId!, patientId: patient.id, displayCode: dto.displayCode, testName: dto.testName, priority: dto.priority ?? 5 } });
      await tx.automationOutbox.create({ data: {
        hospitalId: user.hospitalId!, type: "LAB", eventName: "lab.order.created", correlationId: randomUUID(),
        entityType: "LabOrder", entityId: order.id, priority: dto.priority ?? 5,
        payload: { orderId: order.id, displayCode: order.displayCode },
      } });
      return order;
    });
  }
  @Post(":id/result") @RequirePermissions("lab:update")
  async complete(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CompleteLabOrderDto) {
    const order = await this.prisma.labOrder.findFirstOrThrow({ where: { id, hospitalId: user.hospitalId! } });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.labOrder.update({ where: { id }, data: { status: "PROCESSING", result: dto.result as Prisma.InputJsonValue } });
      await tx.automationOutbox.create({ data: {
        hospitalId: user.hospitalId!, type: "LAB", eventName: "lab.result.ready", correlationId: randomUUID(),
        entityType: "LabOrder", entityId: order.id, priority: order.priority,
        payload: { orderId: order.id, displayCode: order.displayCode },
      } });
      return updated;
    });
  }
}
