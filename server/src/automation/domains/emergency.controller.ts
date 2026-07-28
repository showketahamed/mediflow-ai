import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { randomUUID } from "crypto";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEmergencyDto } from "./domain.dto";

@ApiTags("Emergency Automation")
@ApiBearerAuth()
@Controller("emergencies")
export class EmergencyController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermissions("emergencies:read")
  list(@CurrentUser() user: AuthUser) { return this.prisma.emergencyCase.findMany({ where: { hospitalId: user.hospitalId! }, include: { patient: true }, orderBy: [{ status: "asc" }, { severity: "desc" }] }); }
  @Post() @RequirePermissions("emergencies:create")
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmergencyDto) {
    const patient = dto.patientId ? await this.prisma.patient.findFirstOrThrow({ where: { hospitalId: user.hospitalId!, medicalId: dto.patientId } }) : null;
    return this.prisma.$transaction(async (tx) => {
      const emergency = await tx.emergencyCase.create({ data: { hospitalId: user.hospitalId!, patientId: patient?.id, displayCode: dto.displayCode, severity: dto.severity, description: dto.description, location: dto.location } });
      await tx.automationOutbox.create({ data: {
        hospitalId: user.hospitalId!, type: "EMERGENCY", eventName: "emergency.case.opened", correlationId: randomUUID(),
        entityType: "EmergencyCase", entityId: emergency.id, priority: 1,
        payload: { emergencyId: emergency.id, severity: emergency.severity },
      } });
      return emergency;
    });
  }
  @Post(":id/close") @RequirePermissions("emergencies:update")
  async close(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.prisma.emergencyCase.findFirstOrThrow({ where: { id, hospitalId: user.hospitalId! } });
    return this.prisma.emergencyCase.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
  }
}
