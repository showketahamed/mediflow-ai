import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppErrorBoundary } from "@/app/components/common/AppErrorBoundary";
import { RouteLoader } from "@/app/components/common/LoadingStates";
import { Toaster } from "@/app/components/ui/sonner";
import { AuthProvider } from "@/app/context/AuthContext";
import { DemoProvider } from "@/app/context/DemoContext";
import { AppLayout } from "@/app/layout/AppLayout";
import { ProtectedRoute } from "@/app/routes/ProtectedRoute";
import { RouteMetadata } from "@/app/routes/RouteMetadata";

const DashboardPage = lazy(() => import("@/app/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const PatientsPage = lazy(() => import("@/app/pages/PatientsPage").then((module) => ({ default: module.PatientsPage })));
const PatientDetailsPage = lazy(() => import("@/app/pages/PatientDetailsPage").then((module) => ({ default: module.PatientDetailsPage })));
const DiagnosticsPage = lazy(() => import("@/app/pages/DiagnosticsPage").then((module) => ({ default: module.DiagnosticsPage })));
const AiAssistantPage = lazy(() => import("@/app/pages/AiAssistantPage").then((module) => ({ default: module.AiAssistantPage })));
const SchedulePage = lazy(() => import("@/app/pages/SchedulePage").then((module) => ({ default: module.SchedulePage })));
const AnalyticsPage = lazy(() => import("@/app/pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const NotificationsPage = lazy(() => import("@/app/pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const SettingsPage = lazy(() => import("@/app/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const LoginPage = lazy(() => import("@/app/pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/app/pages/auth/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/app/pages/auth/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const OtpPage = lazy(() => import("@/app/pages/auth/OtpPage").then((module) => ({ default: module.OtpPage })));
const NotFoundPage = lazy(() => import("@/app/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function AppRoutes() {
  const location = useLocation();
  return (
    <AppErrorBoundary resetKey={location.pathname}>
      <RouteMetadata />
      <Suspense fallback={<div className="min-h-dvh bg-[#020912] p-4 text-slate-100 sm:p-6"><RouteLoader /></div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-otp" element={<OtpPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/patients/:id" element={<PatientDetailsPage />} />
              <Route path="/diagnostics" element={<DiagnosticsPage />} />
              <Route path="/ai-assistant" element={<AiAssistantPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster richColors closeButton position="top-right" />
    </AppErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoProvider>
          <AppRoutes />
        </DemoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
