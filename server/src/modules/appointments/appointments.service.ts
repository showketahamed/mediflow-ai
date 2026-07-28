import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateAppointmentDto, UpdateAppointmentDto } from "./appointments.dto";
import { randomUUID } from "crypto";

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private hospitalId(user: AuthUser) {
    if (!user.hospitalId) throw new ForbiddenException("A hospital assignment is required.");
    return user.hospitalId;
  }

  private map(item: any) {
    return {
      id: item.displayCode,
      patientId: item.patient?.medicalId,
      patient: item.patientName,
      type: item.type,
      doctor: item.doctorName,
      room: item.room,
      start: item.startsAt.toISOString().replace(".000Z", ""),
      end: item.endsAt.toISOString().replace(".000Z", ""),
      status: item.status.toLowerCase(),
      notes: item.notes,
    };
  }

  private async patientRecord(hospitalId: string, medicalId?: string) {
    return medicalId ? this.prisma.patient.findFirst({ where: { hospitalId, medicalId } }) : null;
  }

  private async checkConflict(hospitalId: string, doctorName: string, startsAt: Date, endsAt: Date, excludeId?: string) {
    if (endsAt <= startsAt) throw new BadRequestException("End time must be after start time.");
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        hospitalId,
        doctorName,
        status: { not: "CANCELLED" },
        id: excludeId ? { not: excludeId } : undefined,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflict) throw new BadRequestException("The doctor already has a conflicting appointment.");
  }

  async list(user: AuthUser) {
    let patientId: string | undefined;
    if (user.role === UserRole.PATIENT) {
      patientId = (await this.prisma.patient.findUnique({ where: { userId: user.sub } }))?.id;
      if (!patientId) return [];
    }
    const rows = await this.prisma.appointment.findMany({
      where: { hospitalId: this.hospitalId(user), patientId },
      include: { patient: true },
      orderBy: { startsAt: "asc" },
    });
    return rows.map((item) => this.map(item));
  }

  async create(user: AuthUser, dto: CreateAppointmentDto) {
    const hospitalId = this.hospitalId(user);
    const startsAt = new Date(dto.start);
    const endsAt = new Date(dto.end);
    await this.checkConflict(hospitalId, dto.doctor, startsAt, endsAt);
    const patient = await this.patientRecord(hospitalId, dto.patientId);
    const row = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          hospitalId,
          patientId: patient?.id,
          displayCode: dto.displayCode,
          patientName: dto.patient,
          type: dto.type,
          doctorName: dto.doctor,
          room: dto.room,
          startsAt,
          endsAt,
          status: dto.status,
          notes: dto.notes,
        },
        include: { patient: true },
      });
      const reminderAt = new Date(Math.max(Date.now(), startsAt.getTime() - 24 * 60 * 60_000));
      await tx.automationOutbox.createMany({ data: [
        {
          hospitalId, type: "APPOINTMENT", eventName: "appointment.created", correlationId: randomUUID(),
          entityType: "Appointment", entityId: appointment.id,
          payload: { appointmentId: appointment.id, displayCode: appointment.displayCode, expectedStartsAt: appointment.startsAt.toISOString() },
        },
        {
          hospitalId, type: "APPOINTMENT", eventName: "appointment.reminder", correlationId: randomUUID(),
          entityType: "Appointment", entityId: appointment.id, availableAt: reminderAt,
          payload: { appointmentId: appointment.id, displayCode: appointment.displayCode, expectedStartsAt: appointment.startsAt.toISOString() },
        },
      ] });
      return appointment;
    });
    return this.map(row);
  }

  async update(user: AuthUser, displayCode: string, dto: UpdateAppointmentDto) {
    const hospitalId = this.hospitalId(user);
    const existing = await this.prisma.appointment.findFirst({ where: { hospitalId, displayCode } });
    if (!existing) throw new NotFoundException("Appointment not found.");
    const startsAt = dto.start ? new Date(dto.start) : existing.startsAt;
    const endsAt = dto.end ? new Date(dto.end) : existing.endsAt;
    await this.checkConflict(hospitalId, dto.doctor ?? existing.doctorName, startsAt, endsAt, existing.id);
    const patient = dto.patientId ? await this.patientRecord(hospitalId, dto.patientId) : undefined;
    const row = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.update({
        where: { id: existing.id },
        data: {
          patientId: patient?.id,
          patientName: dto.patient,
          type: dto.type,
          doctorName: dto.doctor,
          room: dto.room,
          startsAt: dto.start ? startsAt : undefined,
          endsAt: dto.end ? endsAt : undefined,
          status: dto.status,
          notes: dto.notes,
        },
        include: { patient: true },
      });
      await tx.automationOutbox.create({ data: {
        hospitalId, type: "APPOINTMENT", eventName: "appointment.updated", correlationId: randomUUID(),
        entityType: "Appointment", entityId: appointment.id,
        payload: { appointmentId: appointment.id, displayCode: appointment.displayCode },
      } });
      if (dto.start) {
        const reminderAt = new Date(Math.max(Date.now(), startsAt.getTime() - 24 * 60 * 60_000));
        await tx.automationOutbox.create({ data: {
          hospitalId, type: "APPOINTMENT", eventName: "appointment.reminder", correlationId: randomUUID(),
          entityType: "Appointment", entityId: appointment.id, availableAt: reminderAt,
          payload: { appointmentId: appointment.id, displayCode: appointment.displayCode, expectedStartsAt: appointment.startsAt.toISOString() },
        } });
      }
      return appointment;
    });
    return this.map(row);
  }

  async remove(user: AuthUser, displayCode: string) {
    const hospitalId = this.hospitalId(user);
    const existing = await this.prisma.appointment.findFirst({ where: { hospitalId, displayCode }, include: { patient: true } });
    if (!existing) throw new NotFoundException("Appointment not found.");
    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.delete({ where: { id: existing.id } });
      await tx.automationOutbox.create({ data: {
        hospitalId, type: "N8N", eventName: "appointment.cancelled", correlationId: randomUUID(),
        entityType: "Appointment", entityId: existing.id,
        payload: {
          title: "Appointment cancelled",
          body: `${existing.type} with ${existing.doctorName} on ${existing.startsAt.toLocaleString()} has been cancelled.`,
          patientId: existing.patientId,
          email: existing.patient?.email,
          phone: existing.patient?.phone,
          appointmentId: existing.displayCode,
        },
      } });
    });
    return { message: "Appointment deleted." };
  }
}
