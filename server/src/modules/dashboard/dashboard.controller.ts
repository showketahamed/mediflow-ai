import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermissions("dashboard:read")
  async get(@CurrentUser() user: AuthUser) {
    const hospitalId = user.hospitalId;
    if (!hospitalId) return { stats: { patients: 0, procedures: 0, diagnostics: 0, occupancy: 0 }, vitalData: [], weeklyFlow: [], insights: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const patientProfile = user.role === UserRole.PATIENT
      ? await this.prisma.patient.findUnique({ where: { userId: user.sub } })
      : null;
    const patientScope = user.role === UserRole.PATIENT ? { id: patientProfile?.id ?? "__none__" } : { hospitalId };
    const [patients, appointments, diagnostics, wards, admissions, vitalRows] = await Promise.all([
      this.prisma.patient.findMany({ where: patientScope, include: { admissions: { orderBy: { admittedAt: "desc" }, take: 1 } } }),
      this.prisma.appointment.findMany({ where: { hospitalId, patientId: patientProfile?.id, startsAt: { gte: weekStart } } }),
      this.prisma.diagnostic.count({ where: { hospitalId, patientId: patientProfile?.id } }),
      this.prisma.ward.count({ where: { hospitalId } }),
      this.prisma.admission.findMany({ where: { patient: patientScope, OR: [{ admittedAt: { gte: weekStart } }, { dischargedAt: { gte: weekStart } }] } }),
      this.prisma.vitalSign.findMany({ where: { admission: { patient: patientScope } }, orderBy: { recordedAt: "desc" }, take: 7 }),
    ]);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        admissions: admissions.filter((item) => item.admittedAt.toISOString().startsWith(key)).length,
        discharges: admissions.filter((item) => item.dischargedAt?.toISOString().startsWith(key)).length,
        procedures: appointments.filter((item) => item.startsAt.toISOString().startsWith(key)).length,
      };
    });
    const insights = patients
      .filter((patient) => patient.admissions[0]?.status !== "STABLE")
      .slice(0, 4)
      .map((patient) => ({
        id: `patient-${patient.medicalId}`,
        type: patient.admissions[0]?.status === "CRITICAL" ? "alert" : "warning",
        text: `${patient.medicalId} requires review for ${patient.admissions[0]?.condition}.`,
        confidence: patient.admissions[0]?.status === "CRITICAL" ? 94 : 82,
        details: "This operational signal is derived from the latest recorded admission status and requires clinician review.",
      }));
    return {
      stats: {
        patients: patients.length,
        procedures: appointments.filter((item) => item.startsAt >= today).length,
        diagnostics,
        occupancy: user.role === UserRole.PATIENT ? 0 : Math.min(100, Math.round((patients.length / Math.max(wards * 10, 1)) * 100)),
      },
      vitalData: vitalRows.reverse().map((item) => ({
        time: item.recordedAt.toISOString().slice(11, 16),
        hr: item.heartRate ?? 0,
        bp: item.systolic ?? 0,
        spo2: item.oxygenPercent ?? 98,
      })),
      weeklyFlow: days.map(({ key: _key, ...day }) => day),
      insights,
      generatedAt: new Date().toISOString(),
    };
  }
}
