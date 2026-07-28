import {
  AppointmentStatus,
  DiagnosticStatus,
  Gender,
  PatientStatus,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const password = "Mediflow123!";

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const hospital = await prisma.hospital.upsert({
    where: { code: "MF-DEMO" },
    update: {},
    create: { name: "MediFlow General Hospital", code: "MF-DEMO", timezone: "Asia/Dhaka" },
  });

  const departments = await Promise.all([
    ["Cardiology", "CARD"],
    ["Radiology", "RAD"],
    ["Emergency", "ER"],
    ["Oncology", "ONC"],
    ["Neurology", "NEURO"],
    ["General Medicine", "GEN"],
  ].map(([name, code]) => prisma.department.upsert({
    where: { hospitalId_code: { hospitalId: hospital.id, code } },
    update: { name },
    create: { hospitalId: hospital.id, name, code },
  })));
  const departmentByCode = Object.fromEntries(departments.map((item) => [item.code, item]));

  const wards = await Promise.all([
    ["ICU-3", "ICU-3", "CARD"],
    ["Ward 7B", "WARD-7B", "GEN"],
    ["Ward 4A", "WARD-4A", "GEN"],
    ["Ward 2C", "WARD-2C", "GEN"],
    ["Onco 6D", "ONCO-6D", "ONC"],
    ["Neuro 5B", "NEURO-5B", "NEURO"],
  ].map(([name, code, department]) => prisma.ward.upsert({
    where: { hospitalId_code: { hospitalId: hospital.id, code } },
    update: { name, departmentId: departmentByCode[department].id },
    create: { hospitalId: hospital.id, name, code, departmentId: departmentByCode[department].id },
  })));
  const wardByName = Object.fromEntries(wards.map((item) => [item.name, item]));
  for (const ward of wards) {
    for (const suffix of ["01", "02"]) {
      const code = `${ward.code}-${suffix}`;
      await prisma.bed.upsert({
        where: { hospitalId_code: { hospitalId: hospital.id, code } },
        update: {},
        create: {
          hospitalId: hospital.id,
          wardId: ward.id,
          code,
          type: ward.code.startsWith("ICU") ? "ICU" : "GENERAL",
          status: "AVAILABLE",
        },
      });
    }
  }

  const roleUsers = [
    [UserRole.SUPER_ADMIN, "Super Admin", "superadmin@mediflow.demo", "Platform Owner", null],
    [UserRole.HOSPITAL_ADMIN, "Dr. Sarah Huang", "admin@mediflow.demo", "Operations Lead", "GEN"],
    [UserRole.DOCTOR, "Dr. Chen", "doctor@mediflow.demo", "Consultant Cardiologist", "CARD"],
    [UserRole.NURSE, "Maya Thompson", "nurse@mediflow.demo", "Charge Nurse", "GEN"],
    [UserRole.RECEPTIONIST, "Noah Williams", "reception@mediflow.demo", "Front Desk Lead", "GEN"],
    [UserRole.LAB_TECHNICIAN, "Lina Ahmed", "lab@mediflow.demo", "Senior Lab Technician", "RAD"],
    [UserRole.PHARMACIST, "Omar Rahman", "pharmacist@mediflow.demo", "Clinical Pharmacist", "GEN"],
    [UserRole.PATIENT, "Patient Demo", "patient@mediflow.demo", "Patient", null],
  ] as const;

  const users = new Map<UserRole, { id: string }>();
  for (const [role, name, email, title, departmentCode] of roleUsers) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role, active: true, emailVerified: true, hospitalId: hospital.id },
      create: {
        hospitalId: hospital.id,
        departmentId: departmentCode ? departmentByCode[departmentCode].id : null,
        email,
        passwordHash,
        name,
        title,
        role,
        active: true,
        emailVerified: true,
        settings: { create: {} },
      },
    });
    users.set(role, user);
  }

  const patientRows = [
    ["MF-00142", "Elena Vasquez", 48, Gender.FEMALE, "Cardiac Monitoring", PatientStatus.CRITICAL, "ICU-3", "Dr. Chen", 148, 95, 102, 99.6, "2026-07-23", "+1 (555) 210-1442", "elena.vasquez@mediflow.demo", "Requires continuous rhythm observation and cardiology review."],
    ["MF-00128", "James Okonkwo", 35, Gender.MALE, "Post-Op Recovery", PatientStatus.STABLE, "Ward 7B", "Dr. Patel", 118, 76, 78, 98.4, "2026-07-21", "+1 (555) 310-9051", "james.okonkwo@mediflow.demo", "Progress ahead of target mobility milestones."],
    ["MF-00157", "Aisha Rahman", 62, Gender.FEMALE, "Respiratory Therapy", PatientStatus.WARNING, "Ward 4A", "Dr. Silva", 135, 88, 92, 99.1, "2026-07-20", "+1 (555) 620-5531", "aisha.rahman@mediflow.demo", "Nighttime variability calls for additional observation."],
    ["MF-00103", "Marcus Lindberg", 29, Gender.MALE, "Fracture Management", PatientStatus.STABLE, "Ward 2C", "Dr. Kim", 112, 72, 68, 98.3, "2026-07-18", "+1 (555) 884-3321", "marcus.lindberg@mediflow.demo", "Physical therapy slot booked for progressive load bearing."],
    ["MF-00189", "Sofia Marchetti", 55, Gender.FEMALE, "Oncology - Cycle 4", PatientStatus.STABLE, "Onco 6D", "Dr. Nakamura", 122, 80, 74, 98.9, "2026-07-19", "+1 (555) 932-6640", "sofia.marchetti@mediflow.demo", "Tolerating infusion well; fatigue counselling provided."],
    ["MF-00221", "Theo Bergmann", 71, Gender.MALE, "Neurology Assessment", PatientStatus.WARNING, "Neuro 5B", "Dr. Adeyemi", 142, 90, 88, 98.7, "2026-07-24", "+1 (555) 444-1010", "theo.bergmann@mediflow.demo", "MRI review pending to confirm treatment pathway."],
  ] as const;

  const patientIds = new Map<string, string>();
  for (const [medicalId, name, age, gender, condition, status, ward, doctor, systolic, diastolic, heartRate, temperatureC, admissionDate, phone, email, notes] of patientRows) {
    const existing = await prisma.patient.findUnique({ where: { hospitalId_medicalId: { hospitalId: hospital.id, medicalId } } });
    const patient = existing ?? await prisma.patient.create({
      data: {
        hospitalId: hospital.id,
        userId: medicalId === "MF-00142" ? users.get(UserRole.PATIENT)?.id : undefined,
        medicalId,
        name,
        dateOfBirth: new Date(Date.UTC(2026 - age, 0, 1)),
        gender,
        phone,
        email,
        admissions: {
          create: {
            wardId: wardByName[ward].id,
            condition,
            status,
            attendingName: doctor,
            admittedAt: new Date(`${admissionDate}T08:00:00.000Z`),
            notes,
            vitals: { create: { systolic, diastolic, heartRate, temperatureC } },
          },
        },
      },
    });
    patientIds.set(medicalId, patient.id);
  }

  const appointments = [
    ["APT-1001", "MF-00142", "Elena Vasquez", "Cardiology Review", "Dr. Chen", "Cardiac Suite 1", "2026-07-27T08:30:00.000Z", "2026-07-27T09:15:00.000Z", AppointmentStatus.CONFIRMED, "Includes ECG comparison and medication review."],
    ["APT-1002", null, "New Admission", "Initial Assessment", "Dr. Patel", "ER Bay 3", "2026-07-27T09:15:00.000Z", "2026-07-27T09:45:00.000Z", AppointmentStatus.PENDING, "Reception to attach intake paperwork before physician consult."],
    ["APT-1003", "MF-00128", "James Okonkwo", "Post-Op Check", "Dr. Patel", "Ward 7B", "2026-07-27T10:00:00.000Z", "2026-07-27T10:20:00.000Z", AppointmentStatus.CONFIRMED, "Review incision healing and mobility markers."],
    ["APT-1004", "MF-00157", "Aisha Rahman", "Pulmonology Consult", "Dr. Silva", "Consult Room 4", "2026-07-27T11:30:00.000Z", "2026-07-27T12:30:00.000Z", AppointmentStatus.CONFIRMED, "Evaluate overnight saturation variability."],
    ["APT-1005", "MF-00103", "Marcus Lindberg", "Physiotherapy", "Dr. Kim", "Physio Lab", "2026-07-27T14:00:00.000Z", "2026-07-27T14:45:00.000Z", AppointmentStatus.COMPLETED, "Range-of-motion session completed successfully."],
    ["APT-1006", "MF-00221", "Theo Bergmann", "MRI Scan", "Dr. Adeyemi", "Imaging Suite 2", "2026-07-27T15:30:00.000Z", "2026-07-27T17:00:00.000Z", AppointmentStatus.PENDING, "Prep instructions delivered to nursing station."],
  ] as const;
  for (const [displayCode, medicalId, patientName, type, doctorName, room, startsAt, endsAt, status, notes] of appointments) {
    await prisma.appointment.upsert({
      where: { hospitalId_displayCode: { hospitalId: hospital.id, displayCode } },
      update: {},
      create: {
        hospitalId: hospital.id,
        patientId: medicalId ? patientIds.get(medicalId) : undefined,
        displayCode,
        patientName,
        type,
        doctorName,
        room,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        status,
        notes,
      },
    });
  }

  const admin = users.get(UserRole.HOSPITAL_ADMIN);
  if (admin) {
    const notificationCount = await prisma.notification.count({ where: { userId: admin.id } });
    if (!notificationCount) {
      await prisma.notification.createMany({ data: [
        { userId: admin.id, title: "Critical rhythm alert", body: "Elena Vasquez requires cardiology review in ICU-3.", createdAt: new Date("2026-07-27T07:42:00.000Z") },
        { userId: admin.id, title: "MRI queue update", body: "Imaging Suite 2 is running 15 minutes behind schedule.", createdAt: new Date("2026-07-27T09:10:00.000Z") },
        { userId: admin.id, title: "Discharge candidate", body: "James Okonkwo meets step-down criteria for review.", createdAt: new Date("2026-07-27T10:35:00.000Z"), readAt: new Date("2026-07-27T10:40:00.000Z") },
      ] });
    }
  }

  await prisma.diagnostic.deleteMany({ where: { hospitalId: hospital.id, status: DiagnosticStatus.IDLE } });
  console.info(`Seeded ${hospital.name}. Staff password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
