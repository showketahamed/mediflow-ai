CREATE TYPE "AutomationType" AS ENUM ('APPOINTMENT', 'LAB', 'PHARMACY', 'BED_ALLOCATION', 'EMERGENCY', 'FOLLOW_UP', 'NOTIFICATION', 'N8N');
CREATE TYPE "AutomationStatus" AS ENUM ('QUEUED', 'ACTIVE', 'RETRYING', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "LabOrderStatus" AS ENUM ('ORDERED', 'SAMPLE_PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PharmacyOrderStatus" AS ENUM ('PENDING', 'VALIDATING', 'READY', 'DISPENSED', 'CANCELLED');
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE');
CREATE TYPE "EmergencyStatus" AS ENUM ('OPEN', 'TRIAGED', 'RESPONDING', 'STABILIZED', 'CLOSED');
CREATE TYPE "FollowUpStatus" AS ENUM ('SCHEDULED', 'SENT', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Notification" ADD COLUMN "sourceKey" TEXT;
CREATE UNIQUE INDEX "Notification_userId_sourceKey_key" ON "Notification"("userId", "sourceKey");

CREATE TABLE "AutomationRun" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "type" "AutomationType" NOT NULL,
  "eventName" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "status" "AutomationStatus" NOT NULL DEFAULT 'QUEUED',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "bullJobId" TEXT,
  "n8nExecutionId" TEXT,
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationStepLog" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "step" TEXT NOT NULL,
  "status" "AutomationStatus" NOT NULL,
  "attempt" INTEGER NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AutomationStepLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationOutbox" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "type" "AutomationType" NOT NULL,
  "eventName" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "payload" JSONB NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 5,
  "delayMs" INTEGER NOT NULL DEFAULT 0,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabOrder" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "displayCode" TEXT NOT NULL,
  "testName" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 5,
  "status" "LabOrderStatus" NOT NULL DEFAULT 'ORDERED',
  "sampleId" TEXT,
  "result" JSONB,
  "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyOrder" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "displayCode" TEXT NOT NULL,
  "medication" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "instructions" TEXT NOT NULL,
  "status" "PharmacyOrderStatus" NOT NULL DEFAULT 'PENDING',
  "validation" JSONB,
  "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispensedAt" TIMESTAMP(3),
  CONSTRAINT "PharmacyOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bed" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "wardId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
  CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BedAllocation" (
  "id" TEXT NOT NULL,
  "bedId" TEXT NOT NULL,
  "admissionId" TEXT NOT NULL,
  "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "BedAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmergencyCase" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT,
  "displayCode" TEXT NOT NULL,
  "severity" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "status" "EmergencyStatus" NOT NULL DEFAULT 'OPEN',
  "location" TEXT,
  "response" JSONB,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stabilizedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "EmergencyCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowUp" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "channel" TEXT NOT NULL,
  "status" "FollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
  "sentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationRun_hospitalId_createdAt_idx" ON "AutomationRun"("hospitalId", "createdAt");
CREATE INDEX "AutomationRun_status_createdAt_idx" ON "AutomationRun"("status", "createdAt");
CREATE INDEX "AutomationRun_correlationId_idx" ON "AutomationRun"("correlationId");
CREATE INDEX "AutomationRun_entityType_entityId_idx" ON "AutomationRun"("entityType", "entityId");
CREATE UNIQUE INDEX "AutomationRun_correlationId_eventName_key" ON "AutomationRun"("correlationId", "eventName");
CREATE INDEX "AutomationStepLog_runId_startedAt_idx" ON "AutomationStepLog"("runId", "startedAt");
CREATE INDEX "AutomationOutbox_status_availableAt_idx" ON "AutomationOutbox"("status", "availableAt");
CREATE INDEX "AutomationOutbox_hospitalId_createdAt_idx" ON "AutomationOutbox"("hospitalId", "createdAt");
CREATE UNIQUE INDEX "AutomationOutbox_correlationId_eventName_key" ON "AutomationOutbox"("correlationId", "eventName");
CREATE UNIQUE INDEX "LabOrder_hospitalId_displayCode_key" ON "LabOrder"("hospitalId", "displayCode");
CREATE INDEX "LabOrder_hospitalId_status_priority_idx" ON "LabOrder"("hospitalId", "status", "priority");
CREATE INDEX "LabOrder_patientId_orderedAt_idx" ON "LabOrder"("patientId", "orderedAt");
CREATE UNIQUE INDEX "PharmacyOrder_hospitalId_displayCode_key" ON "PharmacyOrder"("hospitalId", "displayCode");
CREATE INDEX "PharmacyOrder_hospitalId_status_idx" ON "PharmacyOrder"("hospitalId", "status");
CREATE INDEX "PharmacyOrder_patientId_orderedAt_idx" ON "PharmacyOrder"("patientId", "orderedAt");
CREATE UNIQUE INDEX "Bed_hospitalId_code_key" ON "Bed"("hospitalId", "code");
CREATE INDEX "Bed_hospitalId_status_type_idx" ON "Bed"("hospitalId", "status", "type");
CREATE INDEX "Bed_wardId_status_idx" ON "Bed"("wardId", "status");
CREATE INDEX "BedAllocation_admissionId_releasedAt_idx" ON "BedAllocation"("admissionId", "releasedAt");
CREATE INDEX "BedAllocation_bedId_releasedAt_idx" ON "BedAllocation"("bedId", "releasedAt");
CREATE UNIQUE INDEX "EmergencyCase_hospitalId_displayCode_key" ON "EmergencyCase"("hospitalId", "displayCode");
CREATE INDEX "EmergencyCase_hospitalId_status_severity_idx" ON "EmergencyCase"("hospitalId", "status", "severity");
CREATE INDEX "FollowUp_hospitalId_status_scheduledAt_idx" ON "FollowUp"("hospitalId", "status", "scheduledAt");
CREATE INDEX "FollowUp_patientId_scheduledAt_idx" ON "FollowUp"("patientId", "scheduledAt");

ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationStepLog" ADD CONSTRAINT "AutomationStepLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationOutbox" ADD CONSTRAINT "AutomationOutbox_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyOrder" ADD CONSTRAINT "PharmacyOrder_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyOrder" ADD CONSTRAINT "PharmacyOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BedAllocation" ADD CONSTRAINT "BedAllocation_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BedAllocation" ADD CONSTRAINT "BedAllocation_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmergencyCase" ADD CONSTRAINT "EmergencyCase_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmergencyCase" ADD CONSTRAINT "EmergencyCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
