import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDemo } from "@/app/context/DemoContext";
import { GlassCard } from "@/app/components/common/GlassCard";
import { PageShell } from "@/app/components/common/PageShell";
import { StatusBadge } from "@/app/components/common/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/common/EmptyState";
import { CalendarX } from "lucide-react";

export function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, appointments } = useDemo();
  const patient = patients.find((item) => item.id === id);
  const patientAppointments = appointments.filter((appointment) => appointment.patientId === patient?.id);

  if (!patient) {
    return <Navigate to="/patients" replace />;
  }

  return (
    <PageShell>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">{patient.name}</h2>
          <p className="text-sm text-slate-400">{patient.id} · {patient.condition}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/patients")}>Back to patients</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Clinical snapshot</h3>
            <StatusBadge status={patient.status} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ward</p><p className="mt-2 text-sm text-white">{patient.ward}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Doctor</p><p className="mt-2 text-sm text-white">{patient.doctor}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Vitals</p><p className="mt-2 text-sm text-white">{patient.bloodPressure} · {patient.heartRate} bpm · {patient.temperature} F</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admission</p><p className="mt-2 text-sm text-white">{patient.admissionDate}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact</p><p className="mt-2 text-sm text-white">{patient.phone}</p></div>
            <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</p><p className="mt-2 text-sm text-white">{patient.email}</p></div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/8 bg-white/4 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Notes</p>
            <p className="mt-2 text-sm text-slate-300">{patient.notes}</p>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white">Upcoming appointments</h3>
          <div className="mt-4 space-y-3">
            {patientAppointments.map((appointment) => (
              <div key={appointment.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-white">{appointment.type}</p>
                <p className="mt-1 text-xs text-slate-400">{appointment.start} · {appointment.room}</p>
                <div className="mt-3"><StatusBadge status={appointment.status} /></div>
              </div>
            ))}
            {!patientAppointments.length ? <EmptyState compact icon={CalendarX} title="No upcoming appointments" description="Scheduled visits for this patient will appear here." /> : null}
          </div>
        </GlassCard>
      </div>
    </PageShell>
  );
}
