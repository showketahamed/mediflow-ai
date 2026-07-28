import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, SearchX } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDemo } from "@/app/context/DemoContext";
import { GlassCard } from "@/app/components/common/GlassCard";
import { PageShell } from "@/app/components/common/PageShell";
import { StatusBadge } from "@/app/components/common/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import type { Patient, PatientStatus } from "@/types";
import { EmptyState } from "@/app/components/common/EmptyState";

const blankPatient: Patient = {
  id: "",
  name: "",
  age: 0,
  gender: "Female",
  condition: "",
  status: "stable",
  ward: "",
  doctor: "",
  bloodPressure: "",
  heartRate: 0,
  temperature: 98.6,
  admissionDate: "2026-07-27",
  phone: "",
  email: "",
  notes: "",
};

export function PatientsPage() {
  const { patients, addPatient, updatePatient, updatePatientStatus, deletePatient } = useDemo();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const filter = (params.get("filter") ?? "all") as "all" | PatientStatus;
  const [search, setSearch] = useState("");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredPatients = useMemo(
    () =>
      patients.filter((patient) => {
        const matchesFilter = filter === "all" ? true : patient.status === filter;
        const query = search.toLowerCase();
        const matchesSearch =
          patient.name.toLowerCase().includes(query) ||
          patient.id.toLowerCase().includes(query) ||
          patient.condition.toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
      }),
    [filter, patients, search],
  );

  return (
    <PageShell>
      <GlassCard className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Patients</h2>
            <p className="text-sm text-slate-400">Search, filter, admit, edit, transfer, discharge, or remove demo records.</p>
          </div>
          <Button onClick={() => {
            setEditingPatient({ ...blankPatient, id: `MF-${Math.floor(10000 + Math.random() * 89999)}` });
            setFormOpen(true);
          }}><Plus className="mr-2 h-4 w-4" />Admit Patient</Button>
        </div>
        <div className="mb-5 flex flex-wrap gap-3">
          <Input aria-label="Search patients" placeholder="Search patients, IDs, or conditions" value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
          {["all", "critical", "warning", "stable"].map((value) => (
            <Button key={value} variant={filter === value ? "default" : "secondary"} onClick={() => setParams(value === "all" ? {} : { filter: value })}>
              {value === "all" ? "All Patients" : value[0].toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>
        <div className="grid gap-3">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="grid gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 md:grid-cols-[1.6fr_1fr_auto] md:items-center">
              <button className="text-left" onClick={() => navigate(`/patients/${patient.id}`)}>
                <p className="text-sm font-semibold text-white">{patient.name}</p>
                <p className="mt-1 text-xs text-slate-400">{patient.id} · {patient.condition}</p>
              </button>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <StatusBadge status={patient.status} />
                <span>{patient.ward}</span>
                <span>{patient.doctor}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/4 transition hover:border-white/14" aria-label={`Patient actions for ${patient.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 border-white/10 bg-slate-950/95 text-slate-200">
                  <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>View Details</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setEditingPatient(patient);
                    setFormOpen(true);
                  }}>Edit Patient</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const nextStatus: PatientStatus = patient.status === "critical" ? "warning" : patient.status === "warning" ? "stable" : "critical";
                    updatePatientStatus(patient.id, nextStatus);
                    toast.success(`${patient.name} marked ${nextStatus}.`);
                  }}>Update Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setEditingPatient({ ...patient, ward: patient.ward === "ICU-3" ? "Ward 8A" : "ICU-3" });
                    setFormOpen(true);
                  }}>Transfer Ward</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    updatePatientStatus(patient.id, "stable");
                    toast.success(`${patient.name} prepared for discharge review.`);
                  }}>Discharge Patient</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmId(patient.id)}>Delete Patient</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {!filteredPatients.length ? <EmptyState icon={SearchX} title={patients.length ? "No matching patients" : "No patients yet"} description={patients.length ? "Try a different search term or clear the current status filter." : "Admit the first patient to begin care coordination."} actionLabel={patients.length ? "Clear filters" : undefined} onAction={patients.length ? () => { setSearch(""); setParams({}); } : undefined} /> : null}
        </div>
      </GlassCard>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-slate-950/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>{patients.some((patient) => patient.id === editingPatient?.id) ? "Edit patient" : "Admit patient"}</DialogTitle>
            <DialogDescription>Complete all required fields before saving.</DialogDescription>
          </DialogHeader>
          {editingPatient ? (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!editingPatient.name || !editingPatient.condition || !editingPatient.doctor || !editingPatient.ward) {
                  toast.error("Name, condition, doctor, and ward are required.");
                  return;
                }
                setSaving(true);
                try {
                  if (patients.some((patient) => patient.id === editingPatient.id)) {
                    await updatePatient(editingPatient);
                    toast.success("Patient record updated.");
                  } else {
                    await addPatient(editingPatient);
                    toast.success("Patient admitted successfully.");
                  }
                  setFormOpen(false);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {(["name", "condition", "doctor", "ward", "phone", "email", "bloodPressure"] as const).map((field) => (
                <Input key={field} aria-label={field.replace(/([A-Z])/g, " $1")} placeholder={field} value={editingPatient[field] as string} onChange={(event) => setEditingPatient((current) => current ? { ...current, [field]: event.target.value } : current)} />
              ))}
              <Input aria-label="Age" type="number" placeholder="Age" value={editingPatient.age || ""} onChange={(event) => setEditingPatient((current) => current ? { ...current, age: Number(event.target.value) } : current)} />
              <Input aria-label="Heart rate" type="number" placeholder="Heart rate" value={editingPatient.heartRate || ""} onChange={(event) => setEditingPatient((current) => current ? { ...current, heartRate: Number(event.target.value) } : current)} />
              <Input aria-label="Temperature" type="number" step="0.1" placeholder="Temperature" value={editingPatient.temperature || ""} onChange={(event) => setEditingPatient((current) => current ? { ...current, temperature: Number(event.target.value) } : current)} />
              <Select value={editingPatient.status} onValueChange={(value) => setEditingPatient((current) => current ? { ...current, status: value as PatientStatus } : current)}>
                <SelectTrigger aria-label="Patient status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                </SelectContent>
              </Select>
              <textarea aria-label="Clinical notes" className="min-h-28 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-slate-100 outline-none md:col-span-2" placeholder="Clinical notes" value={editingPatient.notes} onChange={(event) => setEditingPatient((current) => current ? { ...current, notes: event.target.value } : current)} />
              <DialogFooter className="md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save patient"}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmId)} onOpenChange={(open) => !open && setConfirmId(null)}>
        <DialogContent className="border-white/10 bg-slate-950/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete patient?</DialogTitle>
            <DialogDescription>This action removes the demo patient record and linked appointments.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (confirmId) {
                deletePatient(confirmId);
                toast.success("Patient deleted.");
              }
              setConfirmId(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
