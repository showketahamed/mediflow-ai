import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "motion/react";
import { toast } from "sonner";
import { defaultSettings } from "@/data/demoData";
import { dataApi } from "@/app/services/apiClient";
import { useAuth } from "@/app/context/AuthContext";
import type {
  Appointment,
  DemoState,
  DiagnosticResult,
  Patient,
  PatientStatus,
  SettingsState,
} from "@/types";

interface DemoContextValue extends DemoState {
  loading: boolean;
  refreshData: () => Promise<void>;
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (patient: Patient) => Promise<void>;
  deletePatient: (patientId: string) => Promise<void>;
  updatePatientStatus: (patientId: string, status: PatientStatus) => Promise<void>;
  addAppointment: (appointment: Appointment) => Promise<void>;
  updateAppointment: (appointment: Appointment) => Promise<void>;
  deleteAppointment: (appointmentId: string) => Promise<void>;
  saveDiagnosticResult: (result: DiagnosticResult) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updateSettings: (settings: SettingsState) => Promise<void>;
  resetAllDemoData: () => void;
}

const emptyState: DemoState = {
  patients: [],
  appointments: [],
  notifications: [],
  diagnostics: [],
  settings: defaultSettings,
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [state, setState] = useState<DemoState>(emptyState);
  const [loading, setLoading] = useState(Boolean(session));

  async function refreshData() {
    if (!session) {
      setState(emptyState);
      return;
    }
    setLoading(true);
    try {
      const [patients, appointments, notifications, diagnostics, settings] = await Promise.all([
        dataApi.patients(),
        dataApi.appointments(),
        dataApi.notifications(),
        dataApi.diagnostics(),
        dataApi.settings(),
      ]);
      setState({ patients, appointments, notifications, diagnostics, settings });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load hospital data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, [session?.user.id]);

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      notifications: state.settings.notificationsEnabled ? state.notifications : [],
      loading,
      refreshData,
      async addPatient(patient) {
        const saved = await dataApi.createPatient(patient);
        setState((current) => ({ ...current, patients: [saved, ...current.patients] }));
      },
      async updatePatient(patient) {
        const saved = await dataApi.updatePatient(patient);
        setState((current) => ({
          ...current,
          patients: current.patients.map((item) => (item.id === saved.id ? saved : item)),
        }));
      },
      async deletePatient(patientId) {
        await dataApi.deletePatient(patientId);
        setState((current) => ({
          ...current,
          patients: current.patients.filter((item) => item.id !== patientId),
          appointments: current.appointments.filter((item) => item.patientId !== patientId),
        }));
      },
      async updatePatientStatus(patientId, status) {
        const saved = await dataApi.updatePatientStatus(patientId, status);
        setState((current) => ({
          ...current,
          patients: current.patients.map((item) => (item.id === patientId ? saved : item)),
        }));
      },
      async addAppointment(appointment) {
        const saved = await dataApi.createAppointment(appointment);
        setState((current) => ({ ...current, appointments: [saved, ...current.appointments] }));
      },
      async updateAppointment(appointment) {
        const saved = await dataApi.updateAppointment(appointment);
        setState((current) => ({
          ...current,
          appointments: current.appointments.map((item) => (item.id === saved.id ? saved : item)),
        }));
      },
      async deleteAppointment(appointmentId) {
        await dataApi.deleteAppointment(appointmentId);
        setState((current) => ({
          ...current,
          appointments: current.appointments.filter((item) => item.id !== appointmentId),
        }));
      },
      async saveDiagnosticResult(result) {
        const saved = await dataApi.saveDiagnostic(result);
        setState((current) => {
          const existing = current.diagnostics.some((item) => item.id === saved.id);
          return {
            ...current,
            diagnostics: existing
              ? current.diagnostics.map((item) => (item.id === saved.id ? saved : item))
              : [saved, ...current.diagnostics],
          };
        });
      },
      async markNotificationRead(id) {
        await dataApi.markNotificationRead(id);
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((item) => (item.id === id ? { ...item, read: true } : item)),
        }));
      },
      async markAllNotificationsRead() {
        await dataApi.markAllNotificationsRead();
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((item) => ({ ...item, read: true })),
        }));
      },
      async deleteNotification(id) {
        await dataApi.deleteNotification(id);
        setState((current) => ({
          ...current,
          notifications: current.notifications.filter((item) => item.id !== id),
        }));
      },
      async updateSettings(settings) {
        const previous = state.settings;
        setState((current) => ({ ...current, settings }));
        try {
          const saved = await dataApi.updateSettings(settings);
          setState((current) => ({ ...current, settings: saved }));
        } catch (error) {
          setState((current) => ({ ...current, settings: previous }));
          throw error;
        }
      },
      resetAllDemoData() {
        void refreshData();
        toast.success("Hospital data refreshed from the server.");
      },
    }),
    [loading, session, state],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.lang = state.settings.language;
    root.dataset.theme = state.settings.theme;
    root.classList.toggle("theme-darker", state.settings.theme === "darker");
    root.classList.toggle("reduce-motion", state.settings.reducedMotion);
    root.style.colorScheme = "dark";
    root.style.setProperty("scroll-behavior", state.settings.reducedMotion ? "auto" : "smooth");
  }, [state.settings]);

  return (
    <MotionConfig reducedMotion={state.settings.reducedMotion ? "always" : "user"}>
      <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
    </MotionConfig>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used within DemoProvider");
  return context;
}
