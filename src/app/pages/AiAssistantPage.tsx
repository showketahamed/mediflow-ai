import { useState } from "react";
import { Bot, CalendarClock, FileScan, FileText, Mic, Send, Sparkles, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/app/components/common/GlassCard";
import { PageShell } from "@/app/components/common/PageShell";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import { useDemo } from "@/app/context/DemoContext";
import { aiApi } from "@/app/services/apiClient";
import type { AiMeta } from "@/types";
import { Skeleton } from "@/app/components/ui/skeleton";

type AiResult = object & { meta?: AiMeta; conversationId?: string };

function ResultPanel({ result, busy }: { result: AiResult | null; busy: boolean }) {
  if (busy) {
    return <div className="space-y-3" role="status" aria-label="Generating AI result"><Skeleton className="h-5 w-32" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></div>;
  }
  if (!result) {
    return <p className="text-sm text-slate-400">Your AI result will appear here. Content is processed by the secured server API.</p>;
  }
  const entries = Object.entries(result).filter(([key]) => key !== "meta" && key !== "conversationId");
  return (
    <div className="space-y-4">
      {result.meta ? (
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
          <span className="rounded-full border border-white/10 px-2 py-1">{result.meta.provider}</span>
          <span className="rounded-full border border-white/10 px-2 py-1">{result.meta.model}</span>
          {result.meta.demo ? <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-amber-200">Demo mode</span> : null}
        </div>
      ) : null}
      {entries.map(([key, value]) => (
        <div key={key}>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">{key.replace(/([A-Z])/g, " $1")}</p>
          {Array.isArray(value) ? (
            <div className="space-y-2">
              {value.map((item, index) => (
                <div key={`${key}-${index}`} className="rounded-2xl border border-white/8 bg-white/4 p-3 text-sm text-slate-300">
                  {typeof item === "object" ? Object.entries(item as Record<string, unknown>).map(([label, text]) => (
                    <p key={label}><span className="font-semibold text-white">{label.replace(/([A-Z])/g, " $1")}:</span> {String(text)}</p>
                  )) : String(item)}
                </div>
              ))}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function AiAssistantPage() {
  const { patients } = useDemo();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [patientId, setPatientId] = useState("");
  const [report, setReport] = useState("");
  const [appointmentRequest, setAppointmentRequest] = useState("");

  async function run(operation: () => Promise<AiResult>) {
    setBusy(true);
    setResult(null);
    try {
      const next = await operation();
      setResult(next);
      toast.success("AI request completed.");
      return next;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendAssistant(receptionist: boolean) {
    if (!message.trim()) return;
    const next = await run(() => receptionist
      ? aiApi.receptionist(message, conversationId)
      : aiApi.chat(message, conversationId));
    if (next && typeof next.conversationId === "string") setConversationId(next.conversationId);
    setMessage("");
  }

  function uploadFile(file: File | undefined, type: "ocr" | "voice") {
    if (!file) return;
    void run(() => type === "ocr" ? aiApi.ocr(file) : aiApi.voiceNote(file));
  }

  return (
    <PageShell>
      <GlassCard className="overflow-hidden p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#7c3aed)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">MediFlow AI workspace</h2>
            <p className="text-sm text-slate-400">Secure assistance, clinical documentation, and hospital workflow support.</p>
          </div>
        </div>

        <Tabs defaultValue="chat" onValueChange={() => setResult(null)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-white/5 p-1.5">
            <TabsTrigger value="chat"><Bot /> AI Chat</TabsTrigger>
            <TabsTrigger value="patient"><UserRoundSearch /> Patient Summary</TabsTrigger>
            <TabsTrigger value="appointment"><CalendarClock /> Appointment</TabsTrigger>
            <TabsTrigger value="documents"><FileText /> Reports & OCR</TabsTrigger>
            <TabsTrigger value="voice"><Mic /> Voice Notes</TabsTrigger>
          </TabsList>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <GlassCard className="p-5">
              <TabsContent value="chat" className="space-y-4">
                <div>
                  <h3 className="font-bold text-white">AI Receptionist and Chat</h3>
                  <p className="mt-1 text-sm text-slate-400">Ask about care navigation, operations, or appointments.</p>
                </div>
                <Textarea aria-label="Message for AI assistant" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How can MediFlow help?" className="min-h-36 border-white/10 bg-slate-950/50 text-white" />
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy || !message.trim()} onClick={() => void sendAssistant(false)}><Send /> Ask AI</Button>
                  <Button variant="secondary" disabled={busy || !message.trim()} onClick={() => void sendAssistant(true)}>Ask Receptionist</Button>
                </div>
              </TabsContent>

              <TabsContent value="patient" className="space-y-4">
                <div>
                  <h3 className="font-bold text-white">AI Patient Summary</h3>
                  <p className="mt-1 text-sm text-slate-400">Create a concise longitudinal summary from the live patient record.</p>
                </div>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger aria-label="Patient for summary"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button disabled={busy || !patientId} onClick={() => void run(() => aiApi.patientSummary(patientId))}>Generate summary</Button>
              </TabsContent>

              <TabsContent value="appointment" className="space-y-4">
                <div>
                  <h3 className="font-bold text-white">AI Appointment Assistant</h3>
                  <p className="mt-1 text-sm text-slate-400">Find non-conflicting options from the current hospital schedule.</p>
                </div>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger aria-label="Patient for appointment"><SelectValue placeholder="Patient (optional)" /></SelectTrigger>
                  <SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea aria-label="Appointment request" value={appointmentRequest} onChange={(event) => setAppointmentRequest(event.target.value)} placeholder="Example: Cardiology follow-up next week, mornings preferred." className="min-h-32 border-white/10 bg-slate-950/50 text-white" />
                <Button disabled={busy || !appointmentRequest.trim()} onClick={() => void run(() => aiApi.appointmentAssistant(appointmentRequest, patientId))}>Find options</Button>
              </TabsContent>

              <TabsContent value="documents" className="space-y-5">
                <div>
                  <h3 className="font-bold text-white">Medical Report Summarizer</h3>
                  <p className="mt-1 text-sm text-slate-400">Paste report text for a structured plain-language summary.</p>
                </div>
                <Textarea aria-label="Medical report text" value={report} onChange={(event) => setReport(event.target.value)} placeholder="Paste medical report text..." className="min-h-36 border-white/10 bg-slate-950/50 text-white" />
                <Button disabled={busy || report.trim().length < 10} onClick={() => void run(() => aiApi.reportSummary(report))}>Summarize report</Button>
                <div className="border-t border-white/8 pt-5">
                  <h3 className="font-bold text-white">Medical OCR</h3>
                  <p className="mb-3 mt-1 text-sm text-slate-400">Upload a clear image. Files are processed in memory and are not stored.</p>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-5 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10">
                    <FileScan className="h-5 w-5" /> Choose medical image
                    <input className="sr-only" type="file" accept="image/*" disabled={busy} onChange={(event) => uploadFile(event.target.files?.[0], "ocr")} />
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="voice" className="space-y-4">
                <div>
                  <h3 className="font-bold text-white">Voice Notes</h3>
                  <p className="mt-1 text-sm text-slate-400">Transcribe an audio note and organize it into a reviewable clinical format.</p>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-violet-400/30 bg-violet-400/5 p-10 text-sm font-semibold text-violet-200 hover:bg-violet-400/10">
                  <Mic className="h-8 w-8" /> Choose voice recording
                  <span className="text-xs font-normal text-slate-500">Maximum 10 MB</span>
                  <input className="sr-only" type="file" accept="audio/*,video/webm" disabled={busy} onChange={(event) => uploadFile(event.target.files?.[0], "voice")} />
                </label>
              </TabsContent>
            </GlassCard>

            <GlassCard className="min-h-[420px] p-5">
              <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-4">
                <h3 className="font-bold text-white">AI result</h3>
                {busy ? <span className="text-xs font-semibold text-cyan-300">Processing securely...</span> : null}
              </div>
              <ResultPanel result={result} busy={busy} />
            </GlassCard>
          </div>
        </Tabs>
      </GlassCard>
    </PageShell>
  );
}
