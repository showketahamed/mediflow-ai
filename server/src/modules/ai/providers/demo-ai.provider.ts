import { Injectable } from "@nestjs/common";
import type { AiProvider, AiProviderResult, StructuredRequest } from "./ai-provider.interface";

const DISCLAIMER = "AI-generated decision support only. A qualified clinician must verify this information.";

@Injectable()
export class DemoAiProvider implements AiProvider {
  readonly name = "mediflow-demo";
  readonly model = "deterministic-demo-v1";
  readonly isDemo = true;

  async structured<T>(request: StructuredRequest<T>): Promise<AiProviderResult<T>> {
    const sample = this.sample(request.schemaName, request.user);
    return {
      data: request.schema.parse(sample),
      model: this.model,
      provider: this.name,
      demo: true,
      usage: {},
    };
  }

  async transcribe(): Promise<AiProviderResult<string>> {
    return {
      data: "Patient reports improved sleep and reduced pain. Continue current treatment and review symptoms at the next visit.",
      model: this.model,
      provider: this.name,
      demo: true,
      usage: {},
    };
  }

  private sample(name: string, input: string): unknown {
    const excerpt = input.replace(/\s+/g, " ").slice(0, 180);
    switch (name) {
      case "assistant_response":
        return {
          answer: "I can help with hospital services, appointments, and general care navigation. Tell me the service or concern you need help with.",
          suggestions: ["Find an appointment", "Review patient information", "Contact the care team"],
          actions: [{ label: "Open schedule", action: "/schedule" }],
          emergency: false,
        };
      case "patient_summary":
        return {
          overview: `Demo summary based on the available record: ${excerpt}`,
          activeConcerns: ["Current condition should be reviewed against the latest clinical note."],
          recentChanges: ["No verified trend can be inferred in demo mode."],
          medicationsAndOrders: ["Review active laboratory and pharmacy orders in the source record."],
          followUpItems: ["Confirm the care plan with the assigned clinician."],
          missingInformation: ["Medication reconciliation and complete clinical history may be incomplete."],
          disclaimer: DISCLAIMER,
        };
      case "appointment_assistant":
        return {
          response: "I reviewed the current schedule context and prepared non-binding options.",
          suggestedSlots: [],
          questions: ["Which specialty do you need?", "Is this concern urgent?", "Do you prefer morning or afternoon?"],
          nextAction: "Choose a preference, then confirm the appointment with reception.",
        };
      case "diagnosis_suggestion":
        return {
          summary: "Demo differential support generated from the supplied symptoms and record context.",
          possibilities: [
            { name: "Needs clinician assessment", rationale: "Symptoms are not sufficient for a safe diagnostic conclusion.", confidence: 0.35 },
          ],
          redFlags: ["Seek urgent care for severe pain, breathing difficulty, confusion, fainting, or rapid deterioration."],
          recommendedQuestions: ["When did symptoms begin?", "What makes them better or worse?", "Are there new medications or allergies?"],
          recommendedTests: ["Testing should be selected by the responsible clinician after examination."],
          recommendation: "Arrange clinician review and escalate immediately if any red flag is present.",
          disclaimer: `DEMO ONLY. ${DISCLAIMER}`,
        };
      case "medical_ocr":
        return {
          documentType: "Medical document (demo)",
          extractedText: "Demo mode cannot inspect the uploaded image. Configure the server OpenAI provider for OCR.",
          fields: [],
          warnings: ["No image content was transmitted to an external provider in demo mode.", "Verify all extracted text against the original document."],
        };
      case "voice_note":
        return {
          title: "Clinical voice note",
          transcript: excerpt,
          subjective: excerpt,
          objective: "Not stated in the recording.",
          assessment: "Requires clinician review.",
          plan: "Verify transcription and complete the clinical note.",
          followUpItems: ["Confirm all medications, measurements, and names against the recording."],
          disclaimer: DISCLAIMER,
        };
      case "report_summary":
        return {
          plainLanguageSummary: `Demo summary of the supplied report: ${excerpt}`,
          keyFindings: ["Review the complete source report for authoritative findings."],
          abnormalResults: ["No abnormal result is asserted in demo mode."],
          questionsForClinician: ["What findings need follow-up?", "How do these results compare with prior tests?"],
          followUpItems: ["Discuss results with the ordering clinician."],
          disclaimer: DISCLAIMER,
        };
      case "ai_analytics":
        return {
          executiveSummary: "Operational activity is available for review; demo mode does not infer unverified causes.",
          insights: [{ title: "Monitor throughput", detail: excerpt, severity: "info", evidence: "Aggregated hospital metrics supplied by MediFlow." }],
          opportunities: ["Review appointment completion and bed utilization trends."],
          limitations: ["Demo output is deterministic and not a statistical analysis."],
        };
      case "prediction_dashboard":
        return {
          horizon: "Next 7 days",
          predictions: [{ metric: "Patient demand", direction: "stable", expectedValue: "Near current level", confidence: 0.4, rationale: "Demo mode uses no forecasting model." }],
          riskSignals: ["Validate staffing and bed availability against live operational plans."],
          recommendedActions: ["Use predictions as planning support, not as guaranteed forecasts."],
          disclaimer: "Demo forecast only. Validate against live data and operational judgment.",
        };
      default:
        throw new Error(`Unsupported demo schema: ${name}`);
    }
  }
}

