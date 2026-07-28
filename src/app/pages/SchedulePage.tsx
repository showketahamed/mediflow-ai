import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/app/context/DemoContext";
import { formatDateTime, formatTime } from "@/app/lib/utils";
import { GlassCard } from "@/app/components/common/GlassCard";
import { PageShell } from "@/app/components/common/PageShell";
import { StatusBadge } from "@/app/components/common/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import type { Appointment, AppointmentStatus } from "@/types";
import { EmptyState } from "@/app/components/common/EmptyState";
import { CalendarX } from "lucide-react";

const emptyAppointment: Appointment = {
  id: "",
  patient: "",
  type: "",
  doctor: "",
  room: "",
  start: "2026-07-27T09:00:00",
  end: "2026-07-27T09:30:00",
  status: "confirmed",
  notes: "",
};

export function SchedulePage() {
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useDemo();
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("2026-07-27");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [open, setOpen] = useState(false);

  const doctors = [...new Set(appointments.map((item) => item.doctor))];

  const filtered = useMemo(
    () =>
      appointments.filter((appointment) => {
        const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
        const matchesDoctor = doctorFilter === "all" || appointment.doctor === doctorFilter;
        const matchesDate = appointment.start.startsWith(dateFilter);
        return matchesStatus && matchesDoctor && matchesDate;
      }),
    [appointments, dateFilter, doctorFilter, statusFilter],
  );

  async function saveAppointmentRecord() {
    if (!editing) {
      return;
    }
    if (new Date(editing.end) <= new Date(editing.start)) {
      toast.error("End time must be after start time.");
      return;
    }
    const conflict = appointments.some((appointment) => appointment.id !== editing.id && appointment.doctor === editing.doctor && appointment.start < editing.end && editing.start < appointment.end);
    if (conflict) {
      toast.error("This doctor already has a conflicting appointment in the demo schedule.");
      return;
    }
    const payload = editing.id ? editing : { ...editing, id: `APT-${Math.floor(1000 + Math.random() * 9000)}` };
    if (appointments.some((appointment) => appointment.id === payload.id)) {
      await updateAppointment(payload);
      toast.success("Appointment updated.");
    } else {
      await addAppointment(payload);
      toast.success("Appointment added.");
    }
    setOpen(false);
  }

  return (
    <PageShell>
      <GlassCard className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Schedule planner</h2>
            <p className="text-sm text-slate-400">Day, week, and month views share the same validated appointment data.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["day", "week", "month"] as const).map((item) => <Button key={item} variant={view === item ? "default" : "secondary"} onClick={() => setView(item)}>{item}</Button>)}
            <Button onClick={() => {
              setEditing({ ...emptyAppointment, id: "" });
              setOpen(true);
            }}>Add Appointment</Button>
          </div>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Input aria-label="Appointment date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AppointmentStatus | "all")}>
            <SelectTrigger aria-label="Filter by appointment status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger aria-label="Filter by doctor"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All doctors</SelectItem>
              {doctors.map((doctor) => <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={() => toast.success("Schedule data refreshed.")}>Refresh</Button>
        </div>
        <div className="space-y-3">
          {filtered.map((appointment) => (
            <div key={appointment.id} className="grid w-full gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 text-left transition hover:border-cyan-400/20 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-white">{appointment.type}</p>
                <p className="mt-1 text-xs text-slate-400">{appointment.patient} · {appointment.room}</p>
              </div>
              <div className="text-sm text-slate-300">{view === "day" ? `${formatTime(appointment.start)} - ${formatTime(appointment.end)}` : formatDateTime(appointment.start)}</div>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={appointment.status} />
                <Button size="sm" variant="ghost" onClick={() => setSelected(appointment)}>View</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditing(appointment);
                  setOpen(true);
                }}>Edit</Button>
              </div>
            </div>
          ))}
          {!filtered.length ? <EmptyState icon={CalendarX} title="No appointments found" description="Adjust the date, doctor, or status filters, or create a new appointment." actionLabel="Clear filters" onAction={() => { setStatusFilter("all"); setDoctorFilter("all"); }} /> : null}
        </div>
      </GlassCard>

      <Dialog open={Boolean(selected)} onOpenChange={(openState) => !openState && setSelected(null)}>
        <DialogContent className="border-white/10 bg-slate-950/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>{selected?.type}</DialogTitle>
            <DialogDescription>{selected?.patient} · {selected?.doctor}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-300">{selected?.notes}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              if (!selected) {
                return;
              }
              void updateAppointment({ ...selected, status: "completed" });
              toast.success("Appointment marked complete.");
              setSelected(null);
            }}>Mark complete</Button>
            <Button variant="ghost" onClick={() => {
              if (!selected) {
                return;
              }
              setEditing(selected);
              setOpen(true);
              setSelected(null);
            }}>Reschedule</Button>
            <Button variant="destructive" onClick={() => {
              if (!selected) {
                return;
              }
              deleteAppointment(selected.id);
              toast.success("Appointment cancelled.");
              setSelected(null);
            }}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-slate-950/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit appointment" : "Add appointment"}</DialogTitle>
            <DialogDescription>Conflicting doctor times are blocked by the scheduling service.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="grid gap-4 md:grid-cols-2">
              {(["patient", "type", "doctor", "room"] as const).map((field) => (
                <Input key={field} aria-label={field.replace(/([A-Z])/g, " $1")} placeholder={field} value={editing[field]} onChange={(event) => setEditing((current) => current ? { ...current, [field]: event.target.value } : current)} />
              ))}
              <Input aria-label="Appointment start" type="datetime-local" value={editing.start} onChange={(event) => setEditing((current) => current ? { ...current, start: event.target.value } : current)} />
              <Input aria-label="Appointment end" type="datetime-local" value={editing.end} onChange={(event) => setEditing((current) => current ? { ...current, end: event.target.value } : current)} />
              <Select value={editing.status} onValueChange={(value) => setEditing((current) => current ? { ...current, status: value as AppointmentStatus } : current)}>
                <SelectTrigger aria-label="Appointment status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <textarea aria-label="Appointment notes" className="min-h-24 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm outline-none md:col-span-2" value={editing.notes} onChange={(event) => setEditing((current) => current ? { ...current, notes: event.target.value } : current)} placeholder="Notes" />
              <DialogFooter className="md:col-span-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => void saveAppointmentRecord()}>Save appointment</Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
