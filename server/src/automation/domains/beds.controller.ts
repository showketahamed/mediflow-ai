import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { randomUUID } from "crypto";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import { AllocateBedDto } from "./domain.dto";

@ApiTags("Bed Allocation Automation")
@ApiBearerAuth()
@Controller("beds")
export class BedsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermissions("beds:read")
  list(@CurrentUser() user: AuthUser) { return this.prisma.bed.findMany({ where: { hospitalId: user.hospitalId! }, include: { ward: true }, orderBy: { code: "asc" } }); }
  @Post("allocate") @RequirePermissions("beds:allocate")
  async allocate(@CurrentUser() user: AuthUser, @Body() dto: AllocateBedDto) {
    await this.prisma.admission.findFirstOrThrow({ where: { id: dto.admissionId, patient: { hospitalId: user.hospitalId! } } });
    const event = await this.prisma.automationOutbox.create({ data: {
      hospitalId: user.hospitalId!, type: "BED_ALLOCATION", eventName: "bed.allocation.requested", correlationId: randomUUID(),
      entityType: "Admission", entityId: dto.admissionId, payload: { admissionId: dto.admissionId, bedType: dto.bedType ?? null },
    } });
    return { outboxId: event.id, status: event.status };
  }
  @Post("allocations/:id/release") @RequirePermissions("beds:allocate")
  async release(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const allocation = await this.prisma.bedAllocation.findFirstOrThrow({ where: { id, bed: { hospitalId: user.hospitalId! } } });
    return this.prisma.$transaction(async (tx) => {
      await tx.bedAllocation.update({ where: { id }, data: { releasedAt: new Date() } });
      await tx.bed.update({ where: { id: allocation.bedId }, data: { status: "CLEANING" } });
      return { id, status: "RELEASED", bedStatus: "CLEANING" };
    });
  }
}
