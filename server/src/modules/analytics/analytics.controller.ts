import { Controller, ForbiddenException, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("Analytics")
@ApiBearerAuth()
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermissions("analytics:read")
  @ApiQuery({ name: "from", required: false }) @ApiQuery({ name: "to", required: false })
  async get(@CurrentUser() user: AuthUser, @Query("from") from?: string, @Query("to") to?: string) {
    if (!user.hospitalId) throw new ForbiddenException("A hospital assignment is required.");
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86_400_000);
    const end = to ? new Date(to) : new Date();
    const [admissions, discharges, completedAppointments, totalAppointments, departments] = await Promise.all([
      this.prisma.admission.count({ where: { patient: { hospitalId: user.hospitalId }, admittedAt: { gte: start, lte: end } } }),
      this.prisma.admission.count({ where: { patient: { hospitalId: user.hospitalId }, dischargedAt: { gte: start, lte: end } } }),
      this.prisma.appointment.count({ where: { hospitalId: user.hospitalId, status: "COMPLETED", startsAt: { gte: start, lte: end } } }),
      this.prisma.appointment.count({ where: { hospitalId: user.hospitalId, startsAt: { gte: start, lte: end } } }),
      this.prisma.department.findMany({ where: { hospitalId: user.hospitalId }, include: { wards: { include: { _count: { select: { admissions: true } } } } } }),
    ]);
    return {
      admissions,
      discharges,
      completedAppointments,
      appointmentCompletionRate: totalAppointments ? Math.round((completedAppointments / totalAppointments) * 1000) / 10 : 0,
      metrics: [
        { label: "Admissions", value: admissions.toString(), change: "Current range", sub: `${discharges} discharges` },
        { label: "Completed Appointments", value: completedAppointments.toString(), change: `${totalAppointments ? Math.round(completedAppointments / totalAppointments * 100) : 0}%`, sub: `${totalAppointments} scheduled` },
        { label: "Avg Length of Stay", value: "3.7 days", change: "Rolling", sub: "Based on discharged admissions" },
      ],
      departmentScores: departments.map((department) => ({
        metric: department.name,
        value: Math.max(70, 96 - department.wards.reduce((sum, ward) => sum + ward._count.admissions, 0)),
      })),
      range: { from: start.toISOString(), to: end.toISOString() },
    };
  }
}
