import { z } from "zod";

export const assistantSchema = z.object({
  answer: z.string(),
  suggestions: z.array(z.string()),
  actions: z.array(z.object({ label: z.string(), action: z.string() })),
  emergency: z.boolean(),
});

export const patientSummarySchema = z.object({
  overview: z.string(),
  activeConcerns: z.array(z.string()),
  recentChanges: z.array(z.string()),
  medicationsAndOrders: z.array(z.string()),
  followUpItems: z.array(z.string()),
  missingInformation: z.array(z.string()),
  disclaimer: z.string(),
});

export const appointmentAssistantSchema = z.object({
  response: z.string(),
  suggestedSlots: z.array(z.object({
    startsAt: z.string(),
    doctor: z.string(),
    room: z.string(),
    reason: z.string(),
  })),
  questions: z.array(z.string()),
  nextAction: z.string(),
});

export const diagnosisSuggestionSchema = z.object({
  summary: z.string(),
  possibilities: z.array(z.object({
    name: z.string(),
    rationale: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  redFlags: z.array(z.string()),
  recommendedQuestions: z.array(z.string()),
  recommendedTests: z.array(z.string()),
  recommendation: z.string(),
  disclaimer: z.string(),
});

export const ocrSchema = z.object({
  documentType: z.string(),
  extractedText: z.string(),
  fields: z.array(z.object({ label: z.string(), value: z.string() })),
  warnings: z.array(z.string()),
});

export const voiceNoteSchema = z.object({
  title: z.string(),
  transcript: z.string(),
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  followUpItems: z.array(z.string()),
  disclaimer: z.string(),
});

export const reportSummarySchema = z.object({
  plainLanguageSummary: z.string(),
  keyFindings: z.array(z.string()),
  abnormalResults: z.array(z.string()),
  questionsForClinician: z.array(z.string()),
  followUpItems: z.array(z.string()),
  disclaimer: z.string(),
});

export const aiAnalyticsSchema = z.object({
  executiveSummary: z.string(),
  insights: z.array(z.object({
    title: z.string(),
    detail: z.string(),
    severity: z.enum(["info", "positive", "warning", "critical"]),
    evidence: z.string(),
  })),
  opportunities: z.array(z.string()),
  limitations: z.array(z.string()),
});

export const predictionSchema = z.object({
  horizon: z.string(),
  predictions: z.array(z.object({
    metric: z.string(),
    direction: z.enum(["up", "down", "stable"]),
    expectedValue: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
  })),
  riskSignals: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  disclaimer: z.string(),
});

