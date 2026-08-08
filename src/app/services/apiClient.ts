import type {
  Appointment,
  AuthSession,
  DiagnosticResult,
  NotificationItem,
  Patient,
  SettingsState,
  User,
  DashboardData,
  AnalyticsData,
  AutomationMonitor,
  AiAnalyticsResult,
  AiAssistantResult,
  AiDiagnosisResult,
  AiMeta,
  AiPredictionResult,
  SessionInfo,
} from "@/types";
import { resolveApiUrl } from "./apiUrl";

const API_URL = resolveApiUrl();
const ACCESS_TOKEN_KEY = "mediflow-access-token";
let refreshPromise: Promise<string | null> | null = null;
let csrfToken: string | null = null;

interface ApiErrorBody {
  message?: string | string[];
}

interface AuthResponse {
  accessToken: string;
  user: User;
  csrfToken?: string;
}

function tokenStorage() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ? window.localStorage : window.sessionStorage;
}

export function saveAccessToken(token: string, remember = true) {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  (remember ? window.localStorage : window.sessionStorage).setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  csrfToken = null;
}

export function hasAccessToken() {
  return Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY) || window.sessionStorage.getItem(ACCESS_TOKEN_KEY));
}

async function parseError(response: Response) {
  const body = await response.json().catch(() => ({})) as ApiErrorBody;
  const message = Array.isArray(body.message) ? body.message.join(" ") : body.message;
  return new Error(message || `Request failed with status ${response.status}.`);
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${API_URL}/auth/csrf`, { credentials: "include" });
  if (!response.ok) return null;
  const body = await response.json() as { csrfToken: string | null };
  csrfToken = body.csrfToken;
  return csrfToken;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = ensureCsrfToken()
      .then((token) => token ? fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": token,
          "X-Remember-Session": String(tokenStorage() === window.localStorage),
        },
      }) : null)
      .then(async (response) => {
        if (!response?.ok) return null;
        const session = await response.json() as AuthResponse;
        csrfToken = session.csrfToken ?? null;
        const remember = tokenStorage() === window.localStorage;
        saveAccessToken(session.accessToken, remember);
        return session.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, init, false);
    clearAccessToken();
    window.dispatchEvent(new Event("mediflow:unauthorized"));
  }
  if (!response.ok) throw await parseError(response);
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

function upperStatus<T extends { status: string }>(value: T) {
  return { ...value, status: value.status.toUpperCase() };
}

function patientPayload(patient: Patient) {
  const { id: _id, ...fields } = patient;
  return upperStatus(fields);
}

function appointmentPayload(appointment: Appointment) {
  const { id: _id, ...fields } = appointment;
  return upperStatus(fields);
}

function diagnosticPayload(result: DiagnosticResult) {
  const { id: _id, patientName: _patientName, ...fields } = result;
  return upperStatus(fields);
}

export const authApi = {
  async login(input: { email: string; password: string; remember: boolean; role: string }) {
    const result = await apiRequest<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) });
    csrfToken = result.csrfToken ?? null;
    saveAccessToken(result.accessToken, input.remember);
    return result;
  },
  register(input: { name: string; email: string; password: string; role: string }) {
    return apiRequest<{ message: string; developmentOtp?: string }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
  },
  async verifyOtp(email: string, otp: string) {
    const result = await apiRequest<AuthResponse>("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
    csrfToken = result.csrfToken ?? null;
    saveAccessToken(result.accessToken, true);
    return result;
  },
  forgotPassword(email: string) {
    return apiRequest<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  },
  sessions: () => apiRequest<SessionInfo[]>("/auth/sessions"),
  revokeSession: (id: string) => apiRequest<{ message: string }>(`/auth/sessions/${id}`, { method: "DELETE" }),
  async logout() {
    try {
      const token = await ensureCsrfToken();
      await apiRequest("/auth/logout", {
        method: "POST",
        headers: token ? { "X-CSRF-Token": token } : undefined,
      });
    } finally {
      clearAccessToken();
    }
  },
};

export const dataApi = {
  patients: () => apiRequest<Patient[]>("/patients"),
  createPatient: (patient: Patient) => apiRequest<Patient>("/patients", {
    method: "POST",
    body: JSON.stringify({ ...patientPayload(patient), medicalId: patient.id }),
  }),
  updatePatient: (patient: Patient) => apiRequest<Patient>(`/patients/${patient.id}`, {
    method: "PUT",
    body: JSON.stringify(patientPayload(patient)),
  }),
  updatePatientStatus: (id: string, status: string) => apiRequest<Patient>(`/patients/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: status.toUpperCase() }),
  }),
  deletePatient: (id: string) => apiRequest(`/patients/${id}`, { method: "DELETE" }),
  appointments: () => apiRequest<Appointment[]>("/appointments"),
  createAppointment: (appointment: Appointment) => apiRequest<Appointment>("/appointments", {
    method: "POST",
    body: JSON.stringify({ ...appointmentPayload(appointment), displayCode: appointment.id }),
  }),
  updateAppointment: (appointment: Appointment) => apiRequest<Appointment>(`/appointments/${appointment.id}`, {
    method: "PUT",
    body: JSON.stringify(appointmentPayload(appointment)),
  }),
  deleteAppointment: (id: string) => apiRequest(`/appointments/${id}`, { method: "DELETE" }),
  diagnostics: () => apiRequest<DiagnosticResult[]>("/diagnostics"),
  saveDiagnostic: (result: DiagnosticResult) => apiRequest<DiagnosticResult>("/diagnostics", {
    method: "POST",
    body: JSON.stringify({ ...diagnosticPayload(result), displayCode: result.id }),
  }),
  notifications: () => apiRequest<NotificationItem[]>("/notifications"),
  markNotificationRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => apiRequest("/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id: string) => apiRequest(`/notifications/${id}`, { method: "DELETE" }),
  settings: () => apiRequest<SettingsState>("/settings"),
  updateSettings: (settings: SettingsState) => apiRequest<SettingsState>("/settings", { method: "PUT", body: JSON.stringify(settings) }),
  dashboard: () => apiRequest<DashboardData>("/dashboard"),
  analytics: (from?: string, to?: string) => {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    return apiRequest<AnalyticsData>(`/analytics${query.size ? `?${query}` : ""}`);
  },
  automationMonitor: () => apiRequest<AutomationMonitor>("/automations/monitor"),
};

function upload<T>(path: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<T>(path, { method: "POST", body });
}

export const aiApi = {
  chat: (message: string, conversationId?: string) => apiRequest<AiAssistantResult>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversationId }),
  }),
  receptionist: (message: string, conversationId?: string) => apiRequest<AiAssistantResult>("/ai/receptionist", {
    method: "POST",
    body: JSON.stringify({ message, conversationId }),
  }),
  patientSummary: (patientId: string) => apiRequest<Record<string, unknown> & { meta: AiMeta }>(`/ai/patients/${patientId}/summary`, { method: "POST" }),
  appointmentAssistant: (request: string, patientId?: string) => apiRequest<Record<string, unknown> & { meta: AiMeta }>("/ai/appointments/assistant", {
    method: "POST",
    body: JSON.stringify({ request, patientId: patientId || undefined }),
  }),
  diagnosisSuggestions: (input: { patientId: string; symptoms: string; clinicalContext?: string }) => apiRequest<AiDiagnosisResult>("/ai/diagnosis-suggestions", {
    method: "POST",
    body: JSON.stringify(input),
  }),
  ocr: (file: File) => upload<Record<string, unknown> & { meta: AiMeta }>("/ai/ocr", file),
  voiceNote: (file: File) => upload<Record<string, unknown> & { meta: AiMeta }>("/ai/voice-notes", file),
  reportSummary: (report: string) => apiRequest<Record<string, unknown> & { meta: AiMeta }>("/ai/reports/summarize", {
    method: "POST",
    body: JSON.stringify({ report }),
  }),
  analytics: (range: "7d" | "30d" | "90d") => apiRequest<AiAnalyticsResult>("/ai/analytics", {
    method: "POST",
    body: JSON.stringify({ range }),
  }),
  predictions: (range: "7d" | "30d" | "90d") => apiRequest<AiPredictionResult>("/ai/predictions", {
    method: "POST",
    body: JSON.stringify({ range }),
  }),
};

export function toAuthSession(user: User, remember: boolean): AuthSession {
  return { user, remember };
}
