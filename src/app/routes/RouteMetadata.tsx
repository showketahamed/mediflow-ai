import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const metadata: Record<string, { title: string; description: string }> = {
  "/login": { title: "Secure Login", description: "Sign in securely to the MediFlow hospital operations platform." },
  "/register": { title: "Create Patient Account", description: "Create a secure MediFlow patient account." },
  "/forgot-password": { title: "Reset Password", description: "Recover access to your MediFlow account." },
  "/verify-otp": { title: "Verify Account", description: "Verify your MediFlow account securely." },
  "/dashboard": { title: "Operations Dashboard", description: "Live hospital operations, patient flow, and care insights." },
  "/patients": { title: "Patient Management", description: "Hospital-scoped patient records and care coordination." },
  "/diagnostics": { title: "AI Diagnostics", description: "Clinician-reviewed AI diagnostic decision support." },
  "/ai-assistant": { title: "AI Workspace", description: "Secure AI assistance for hospital workflows and documentation." },
  "/schedule": { title: "Schedule", description: "Coordinate hospital appointments and clinical schedules." },
  "/analytics": { title: "Analytics", description: "Hospital performance analytics and planning forecasts." },
  "/notifications": { title: "Notifications", description: "Review operational and clinical notifications." },
  "/settings": { title: "Settings", description: "Manage profile, preferences, and active sessions." },
};

export function RouteMetadata() {
  const location = useLocation();
  useEffect(() => {
    const route = location.pathname.startsWith("/patients/")
      ? { title: "Patient Details", description: "Review a hospital-scoped patient clinical snapshot." }
      : metadata[location.pathname] ?? { title: "Page Not Found", description: "The requested MediFlow screen was not found." };
    document.title = `${route.title} | MediFlow AI`;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", route.description);
  }, [location.pathname]);
  return null;
}
