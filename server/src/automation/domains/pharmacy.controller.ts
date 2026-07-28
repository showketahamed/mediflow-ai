import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { randomUUID } from "crypto";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePharmacyOrderDto } from "./domain.dto";

@ApiTags("Pharmacy Automation")
@ApiBearerAuth()
@Controller("pharmacy/orders")
export class PharmacyController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermissions("pharmacy:read")
  list(@CurrentUser() user: AuthUser) { return this.prisma.pharmacyOrder.findMany({ where: { hospitalId: user.hospitalId! }, include: { patient: true }, orderBy: { orderedAt: "desc" } }); }
  @Post() @RequirePermissions("pharmacy:create")
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreatePharmacyOrderDto) {
    const patient = await this.prisma.patient.findFirstOrThrow({ where: { hospitalId: user.hospitalId!, medicalId: dto.patientId } });
    return this.prisma.$transaction(async (tx) => {
      const { patientId: _medicalId, ...orderData } = dto;
      const order = await tx.pharmacyOrder.create({ data: { hospitalId: user.hospitalId!, patientId: patient.id, ...orderData } });
      await tx.automationOutbox.create({ data: {
        hospitalId: user.hospitalId!, type: "PHARMACY", eventName: "pharmacy.order.created", correlationId: randomUUID(),
        entityType: "PharmacyOrder", entityId: order.id, payload: { orderId: order.id, displayCode: order.displayCode },
      } });
      return order;
    });
  }
  @Post(":id/dispense") @RequirePermissions("pharmacy:update")
  async dispense(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.prisma.pharmacyOrder.findFirstOrThrow({ where: { id, hospitalId: user.hospitalId! } });
    return this.prisma.pharmacyOrder.update({ where: { id }, data: { status: "DISPENSED", dispensedAt: new Date() } });
  }
}
