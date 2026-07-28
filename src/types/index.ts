export type PatientStatus = "critical" | "warning" | "stable";
export type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled";
export type DiagnosticStatus = "idle" | "running" | "cancelled" | "completed";
export type UserRole =
  | "SUPER_ADMIN"
  | "HOSPITAL_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "RECEPTIONIST"
  | "LAB_TECHNICIAN"
  | "PHARMACIST"
  | "PATIENT";
export type ThemeMode = "dark" | "darker";
export type LanguageCode = "en" | "es" | "bn";

export interface VitalPoint {
  time: string;
  hr: number;
  bp: number;
  spo2: number;
}

export interface WeeklyFlowPoint {
  day: string;
  admissions: number;
  discharges: number;
  procedures: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Female" | "Male" | "Non-binary";
  condition: string;
  status: PatientStatus;
  ward: string;
  doctor: string;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  admissionDate: string;
  phone: string;
  email: string;
  notes: string;
}

export interface Insight {
  id: string;
  type: "alert" | "info" | "success" | "warning";
  text: string;
  confidence: number;
  details: string;
}

export interface Appointment {
  id: string;
  patientId?: string;
  patient: string;
  type: string;
  doctor: string;
  room: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  notes: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface DiagnosticResult {
  id: string;
  patientId: string;
  patientName: string;
  scanType: string;
  startedAt: string;
  completedAt?: string;
  status: DiagnosticStatus;
  progress: number;
  summary: string;
  findings: string[];
  recommendation: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  email: string;
}

export interface SettingsState {
  theme: ThemeMode;
  notificationsEnabled: boolean;
  language: LanguageCode;
  reducedMotion: boolean;
}

export interface AnalyticsMetric {
  label: string;
  value: string;
  change: string;
  sub: string;
}

export interface AnalyticsDepartmentScore {
  metric: string;
  value: number;
}

export interface DemoState {
  patients: Patient[];
  appointments: Appointment[];
  notifications: NotificationItem[];
  diagnostics: DiagnosticResult[];
  settings: SettingsState;
}

export interface AuthSession {
  user: User;
  remember: boolean;
}

export interface DashboardData {
  stats: { patients: number; procedures: number; diagnostics: number; occupancy: number };
  vitalData: VitalPoint[];
  weeklyFlow: WeeklyFlowPoint[];
  insights: Insight[];
  generatedAt?: string;
}

export interface AnalyticsData {
  admissions: number;
  discharges: number;
  completedAppointments: number;
  appointmentCompletionRate: number;
  metrics: AnalyticsMetric[];
  departmentScores: AnalyticsDepartmentScore[];
  range: { from: string; to: string };
}

export interface AutomationMonitor {
  redis: Record<"waiting" | "active" | "completed" | "failed" | "delayed" | "paused", number>;
  database: Record<string, number>;
  outboxPending: number;
  successRate: number;
  recent: Array<{
    id: string;
    type: string;
    eventName: string;
    status: string;
    attempt: number;
    error?: string | null;
    createdAt: string;
    completedAt?: string | null;
  }>;
  checkedAt: string;
}

export interface AiMeta {
  provider: string;
  model: string;
  demo: boolean;
  generatedAt: string;
}

export interface AiAssistantResult {
  answer: string;
  suggestions: string[];
  actions: Array<{ label: string; action: string }>;
  emergency: boolean;
  conversationId: string;
  meta: AiMeta;
}

export interface AiDiagnosisResult {
  summary: string;
  possibilities: Array<{ name: string; rationale: string; confidence: number }>;
  redFlags: string[];
  recommendedQuestions: string[];
  recommendedTests: string[];
  recommendation: string;
  disclaimer: string;
  meta: AiMeta;
}

export interface AiAnalyticsResult {
  executiveSummary: string;
  insights: Array<{
    title: string;
    detail: string;
    severity: "info" | "positive" | "warning" | "critical";
    evidence: string;
  }>;
  opportunities: string[];
  limitations: string[];
  meta: AiMeta;
}

export interface AiPredictionResult {
  horizon: string;
  predictions: Array<{
    metric: string;
    direction: "up" | "down" | "stable";
    expectedValue: string;
    confidence: number;
    rationale: string;
  }>;
  riskSignals: string[];
  recommendedActions: string[];
  disclaimer: string;
  meta: AiMeta;
}

export interface SessionInfo {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  expiresAt: string;
}
