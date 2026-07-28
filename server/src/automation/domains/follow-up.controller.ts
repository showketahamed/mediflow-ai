import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { randomUUID } from "crypto";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateFollowUpDto } from "./domain.dto";

@ApiTags("Follow-up Automation")
@ApiBearerAuth()
@Controller("follow-ups")
export class FollowUpController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermissions("followups:read")
  list(@CurrentUser() user: AuthUser) { return this.prisma.followUp.findMany({ where: { hospitalId: user.hospitalId! }, include: { patient: true }, orderBy: { scheduledAt: "asc" } }); }
  @Post() @RequirePermissions("followups:create")
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateFollowUpDto) {
    const patient = await this.prisma.patient.findFirstOrThrow({ where: { hospitalId: user.hospitalId!, medicalId: dto.patientId } });
    const scheduledAt = new Date(dto.scheduledAt);
    return this.prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.create({ data: { hospitalId: user.hospitalId!, patientId: patient.id, reason: dto.reason, scheduledAt, channel: dto.channel } });
      await tx.automationOutbox.create({ data: {
        hospitalId: user.hospitalId!, type: "FOLLOW_UP", eventName: "follow-up.due", correlationId: randomUUID(),
        entityType: "FollowUp", entityId: followUp.id, availableAt: new Date(Math.max(Date.now(), scheduledAt.getTime())),
        payload: { followUpId: followUp.id, patientId: patient.id },
      } });
      return followUp;
    });
  }
  @Post(":id/complete") @RequirePermissions("followups:update")
  async complete(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.prisma.followUp.findFirstOrThrow({ where: { id, hospitalId: user.hospitalId! } });
    return this.prisma.followUp.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
  }
}
