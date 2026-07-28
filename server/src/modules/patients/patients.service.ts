import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Gender, PatientStatus, UserRole } from "@prisma/client";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreatePatientDto, UpdatePatientDto } from "./patients.dto";

const includePatient = {
  admissions: {
    orderBy: { admittedAt: "desc" as const },
    take: 1,
    include: { ward: true, vitals: { orderBy: { recordedAt: "desc" as const }, take: 1 } },
  },
};

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  private hospitalId(user: AuthUser) {
    if (!user.hospitalId) throw new ForbiddenException("A hospital assignment is required.");
    return user.hospitalId;
  }

  private gender(value: string): Gender {
    return value === "Male" ? Gender.MALE : value === "Non-binary" ? Gender.NON_BINARY : Gender.FEMALE;
  }

  private map(patient: any) {
    const admission = patient.admissions[0];
    const vital = admission?.vitals[0];
    const birth = new Date(patient.dateOfBirth);
    const age = Math.max(0, new Date().getUTCFullYear() - birth.getUTCFullYear());
    return {
      id: patient.medicalId,
      name: patient.name,
      age,
      gender: patient.gender === "MALE" ? "Male" : patient.gender === "NON_BINARY" ? "Non-binary" : "Female",
      condition: admission?.condition ?? "",
      status: (admission?.status ?? "STABLE").toLowerCase(),
      ward: admission?.ward?.name ?? "Unassigned",
      doctor: admission?.attendingName ?? "Unassigned",
      bloodPressure: vital?.systolic && vital?.diastolic ? `${vital.systolic}/${vital.diastolic}` : "",
      heartRate: vital?.heartRate ?? 0,
      temperature: vital?.temperatureC ? Number(vital.temperatureC) : 0,
      admissionDate: admission?.admittedAt.toISOString().slice(0, 10) ?? "",
      phone: patient.phone ?? "",
      email: patient.email ?? "",
      notes: admission?.notes ?? "",
    };
  }

  private async assertPatientAccess(user: AuthUser, patientUserId: string | null) {
    if (user.role === UserRole.PATIENT && patientUserId !== user.sub) {
      throw new ForbiddenException("Patients may only access their own record.");
    }
  }

  async list(user: AuthUser) {
    const where = user.role === UserRole.PATIENT
      ? { userId: user.sub }
      : { hospitalId: this.hospitalId(user) };
    const patients = await this.prisma.patient.findMany({ where, include: includePatient, orderBy: { createdAt: "desc" } });
    return patients.map((item) => this.map(item));
  }

  async get(user: AuthUser, medicalId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { hospitalId: this.hospitalId(user), medicalId },
      include: includePatient,
    });
    if (!patient) throw new NotFoundException("Patient not found.");
    await this.assertPatientAccess(user, patient.userId);
    return this.map(patient);
  }

  async create(user: AuthUser, dto: CreatePatientDto) {
    const hospitalId = this.hospitalId(user);
    const ward = await this.prisma.ward.findFirst({ where: { hospitalId, OR: [{ name: dto.ward }, { code: dto.ward }] } });
    const [systolic, diastolic] = dto.bloodPressure.split("/").map(Number);
    const dateOfBirth = new Date(Date.UTC(new Date(dto.admissionDate).getUTCFullYear() - dto.age, 0, 1));
    const patient = await this.prisma.patient.create({
      data: {
        hospitalId,
        medicalId: dto.medicalId,
        name: dto.name,
        dateOfBirth,
        gender: this.gender(dto.gender),
        phone: dto.phone,
        email: dto.email || null,
        admissions: {
          create: {
            wardId: ward?.id,
            condition: dto.condition,
            status: dto.status,
            attendingName: dto.doctor,
            admittedAt: new Date(dto.admissionDate),
            notes: dto.notes,
            vitals: { create: { systolic, diastolic, heartRate: dto.heartRate, temperatureC: dto.temperature } },
          },
        },
      },
      include: includePatient,
    });
    return this.map(patient);
  }

  async update(user: AuthUser, medicalId: string, dto: UpdatePatientDto) {
    const hospitalId = this.hospitalId(user);
    const existing = await this.prisma.patient.findFirst({ where: { hospitalId, medicalId }, include: includePatient });
    if (!existing) throw new NotFoundException("Patient not found.");
    const admission = existing.admissions[0];
    const ward = dto.ward ? await this.prisma.ward.findFirst({ where: { hospitalId, OR: [{ name: dto.ward }, { code: dto.ward }] } }) : null;
    const patientData: Record<string, unknown> = {};
    if (dto.name !== undefined) patientData.name = dto.name;
    if (dto.phone !== undefined) patientData.phone = dto.phone;
    if (dto.email !== undefined) patientData.email = dto.email || null;
    if (dto.gender !== undefined) patientData.gender = this.gender(dto.gender);
    if (dto.age !== undefined) patientData.dateOfBirth = new Date(Date.UTC(new Date().getUTCFullYear() - dto.age, 0, 1));
    await this.prisma.$transaction(async (tx) => {
      await tx.patient.update({ where: { id: existing.id }, data: patientData });
      if (admission) {
        await tx.admission.update({
          where: { id: admission.id },
          data: {
            condition: dto.condition,
            status: dto.status,
            attendingName: dto.doctor,
            wardId: ward?.id,
            notes: dto.notes,
          },
        });
        if (dto.bloodPressure !== undefined || dto.heartRate !== undefined || dto.temperature !== undefined) {
          const [systolic, diastolic] = (dto.bloodPressure ?? "").split("/").map(Number);
          await tx.vitalSign.create({
            data: {
              admissionId: admission.id,
              systolic: Number.isFinite(systolic) ? systolic : undefined,
              diastolic: Number.isFinite(diastolic) ? diastolic : undefined,
              heartRate: dto.heartRate,
              temperatureC: dto.temperature,
            },
          });
        }
      }
    });
    return this.get(user, medicalId);
  }

  async updateStatus(user: AuthUser, medicalId: string, status: PatientStatus) {
    const patient = await this.prisma.patient.findFirst({ where: { hospitalId: this.hospitalId(user), medicalId }, include: includePatient });
    const admission = patient?.admissions[0];
    if (!patient || !admission) throw new NotFoundException("Active patient admission not found.");
    await this.prisma.admission.update({ where: { id: admission.id }, data: { status } });
    return this.get(user, medicalId);
  }

  async remove(user: AuthUser, medicalId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { hospitalId: this.hospitalId(user), medicalId } });
    if (!patient) throw new NotFoundException("Patient not found.");
    await this.prisma.$transaction([
      this.prisma.appointment.deleteMany({ where: { patientId: patient.id } }),
      this.prisma.patient.delete({ where: { id: patient.id } }),
    ]);
    return { message: "Patient deleted." };
  }
}
