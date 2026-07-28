import type { AutomationType, Prisma } from "@prisma/client";

export const AUTOMATION_QUEUE = "mediflow-automation";

export interface AutomationJob {
  runId: string;
  hospitalId: string;
  type: AutomationType;
  eventName: string;
  correlationId: string;
  entityType?: string;
  entityId?: string;
  payload: Prisma.JsonObject;
}

export interface AutomationResult {
  summary: string;
  metadata?: Prisma.JsonObject;
}

export interface OutboxEventInput {
  hospitalId: string;
  type: AutomationType;
  eventName: string;
  correlationId: string;
  entityType?: string;
  entityId?: string;
  payload: Prisma.InputJsonObject;
  priority?: number;
  delayMs?: number;
}
