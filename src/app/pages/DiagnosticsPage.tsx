import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/app/context/DemoContext";
import { downloadTextFile } from "@/app/lib/utils";
import { GlassCard } from "@/app/components/common/GlassCard";
import { PageShell } from "@/app/components/common/PageShell";
import { StatusBadge } from "@/app/components/common/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Progress } from "@/app/components/ui/progress";
import { Textarea } from "@/app/components/ui/textarea";
import { aiApi } from "@/app/services/apiClient";
import { EmptyState } from "@/app/components/common/EmptyState";
import { ScanLine } from "lucide-react";

export function DiagnosticsPage() {
  const { patients, diagnostics, saveDiagnosticResult } = useDemo();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [scanType, setScanType] = useState("Cardiac Scan");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [symptoms, setSymptoms] = useState("");
  const selectedPatient = useMemo(() => patients.find((patient) => patient.id === patientId), [patientId, patients]);

  useEffect(() => {
    if (!patientId && patients[0]) setPatientId(patients[0].id);
  }, [patientId, patients]);

  const latestResult = diagnostics[0];

  async function runScan() {
    if (!selectedPatient || !symptoms.trim()) return;
    setRunning(true);
    setProgress(25);
    try {
      const suggestion = await aiApi.diagnosisSuggestions({
        patientId: selectedPatient.id,
        symptoms,
        clinicalContext: `Requested workflow: ${scanType}`,
      });
      setProgress(85);
      const findings = [
        ...suggestion.possibilities.map((item) => `${item.name} (${Math.round(item.confidence * 100)}%): ${item.rationale}`),
        ...suggestion.redFlags.map((item) => `Red flag: ${item}`),
      ];
      await saveDiagnosticResult({
        id: `scan-${crypto.randomUUID()}`,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        scanType,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: "completed",
        progress: 100,
        summary: suggestion.summary,
        findings,
        recommendation: suggestion.recommendation,
      });
      setProgress(100);
      toast.success("AI suggestions generated and saved.");
    } catch (error) {
      setProgress(0);
      toast.error(error instanceof Error ? error.message : "Unable to generate AI suggestions.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <PageShell>
      <GlassCard className="p-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="text-lg font-bold text-white">AI diagnostic scan lab</h2>
            <p className="mt-2 text-sm text-slate-400">Demo differential-support workflow backed by the secured AI API. Clinician review is always required.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger aria-label="Patient for diagnostics"><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={scanType} onValueChange={setScanType}>
                <SelectTrigger aria-label="Diagnostic mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cardiac Scan">Cardiac Scan</SelectItem>
                  <SelectItem value="Respiratory Review">Respiratory Review</SelectItem>
                  <SelectItem value="Oncology Triage">Oncology Triage</SelectItem>
                  <SelectItem value="Neuro Pattern Scan">Neuro Pattern Scan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              aria-label="Medical text to analyze"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="Describe symptoms, duration, severity, and relevant observations..."
              className="mt-4 min-h-28 border-white/10 bg-slate-950/50 text-white"
            />
            <div className="mt-6 rounded-3xl border border-white/8 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(124,58,237,0.12))] p-6">
              <div className="flex h-52 items-center justify-center rounded-full border border-cyan-400/20 bg-[radial-gradient(circle,rgba(14,165,233,0.35),transparent_60%)]">
                <div className="flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-slate-950/70">
                  <div className={`h-24 w-24 rounded-full border-4 border-dashed border-cyan-400/80 ${running ? "animate-spin" : ""}`} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button disabled={running || !selectedPatient || !symptoms.trim()} onClick={() => void runScan()}>Run AI Review</Button>
              <Button variant="secondary" disabled={!running} onClick={() => toast.message("The active request cannot be cancelled safely.")}>Processing</Button>
              <Button variant="ghost" onClick={() => {
                setProgress(0);
                setSymptoms("");
                toast.success("Review form reset.");
              }}>New Review</Button>
            </div>
            <div className="mt-4">
              <Progress value={progress} className="h-3" />
              <p className="mt-2 text-sm text-slate-400">{running ? `Reviewing ${selectedPatient?.name}...` : progress === 100 ? "AI review completed." : "Ready for clinician-support input."}</p>
            </div>
          </div>
          <div className="space-y-4">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-white">Scan disclaimer</h3>
              <p className="mt-3 text-sm text-amber-100">This AI panel is a demonstration-only prototype. It does not provide certified medical diagnosis and always requires professional review.</p>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Latest result</h3>
                {latestResult ? <StatusBadge status={latestResult.status} /> : null}
              </div>
              {latestResult ? (
                <>
                  <p className="mt-3 text-sm text-slate-200">{latestResult.summary}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-400">
                    {latestResult.findings.map((finding) => <li key={finding} className="rounded-2xl border border-white/8 bg-white/4 p-3">{finding}</li>)}
                  </ul>
                  <p className="mt-3 text-sm text-cyan-200">{latestResult.recommendation}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => toast.success("Result saved to local demo state.")}>Save Result</Button>
                    <Button size="sm" variant="secondary" onClick={() => downloadTextFile(`${latestResult.patientName}-report.txt`, `${latestResult.summary}\n\n${latestResult.findings.join("\n")}`)}>Download Report</Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.success("Mock share action complete.")}>Share</Button>
                    <Button size="sm" variant="ghost" onClick={() => window.print()}>Print</Button>
                  </div>
                </>
              ) : (
                <EmptyState compact icon={ScanLine} title="No AI reviews yet" description="Choose a patient and enter symptoms to create a clinician-support review." />
              )}
            </GlassCard>
          </div>
        </div>
      </GlassCard>
    </PageShell>
  );
}
