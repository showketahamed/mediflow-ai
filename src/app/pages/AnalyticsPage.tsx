import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PolarGrid, PolarAngleAxis } from "recharts";
import { toast } from "sonner";
import { BrainCircuit, Sparkles } from "lucide-react";
import { downloadTextFile, toCsv } from "@/app/lib/utils";
import { aiApi, dataApi } from "@/app/services/apiClient";
import { GlassCard } from "@/app/components/common/GlassCard";
import { PageShell } from "@/app/components/common/PageShell";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import type { AiAnalyticsResult, AiPredictionResult, AnalyticsData, WeeklyFlowPoint } from "@/types";
import { RouteLoader } from "@/app/components/common/LoadingStates";

const emptyAnalytics: AnalyticsData = {
  admissions: 0,
  discharges: 0,
  completedAppointments: 0,
  appointmentCompletionRate: 0,
  metrics: [],
  departmentScores: [],
  range: { from: "", to: "" },
};

export function AnalyticsPage() {
  const [department, setDepartment] = useState("all");
  const [metric, setMetric] = useState("admissions");
  const [range, setRange] = useState("7d");
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [flow, setFlow] = useState<WeeklyFlowPoint[]>([]);
  const [aiInsights, setAiInsights] = useState<AiAnalyticsResult | null>(null);
  const [predictions, setPredictions] = useState<AiPredictionResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAnalytics() {
    const days = Number.parseInt(range, 10);
    const from = new Date(Date.now() - days * 86_400_000).toISOString();
    const [analyticsResult, dashboardResult] = await Promise.all([dataApi.analytics(from), dataApi.dashboard()]);
    setAnalytics(analyticsResult);
    setFlow(dashboardResult.weeklyFlow);
  }

  useEffect(() => {
    setLoading(true);
    void loadAnalytics()
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load analytics."))
      .finally(() => setLoading(false));
  }, [range]);

  async function loadAiAnalysis() {
    setAiLoading(true);
    try {
      const selectedRange = range as "7d" | "30d" | "90d";
      const [insightResult, predictionResult] = await Promise.all([
        aiApi.analytics(selectedRange),
        aiApi.predictions(selectedRange),
      ]);
      setAiInsights(insightResult);
      setPredictions(predictionResult);
      toast.success("AI analysis refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load AI analysis.");
    } finally {
      setAiLoading(false);
    }
  }

  const radarData = useMemo(
    () => analytics.departmentScores.filter((item) => department === "all" || item.metric === department),
    [analytics.departmentScores, department],
  );

  if (loading && !analytics.range.from) return <RouteLoader />;

  return (
    <PageShell>
      <GlassCard className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Analytics</h2>
            <p className="text-sm text-slate-400">Interactive chart filters, export actions, and printable reporting.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={async () => { await loadAnalytics(); toast.success("Analytics refreshed."); }}>Refresh data</Button>
            <Button variant="secondary" disabled={aiLoading} onClick={() => void loadAiAnalysis()}><Sparkles /> {aiLoading ? "Analyzing..." : "Run AI analysis"}</Button>
            <Button variant="secondary" onClick={() => downloadTextFile("mediflow-analytics.csv", toCsv(flow.map((item) => ({ day: item.day, admissions: item.admissions, discharges: item.discharges, procedures: item.procedures }))), "text/csv;charset=utf-8")}>Export CSV</Button>
            <Button onClick={() => window.print()}>Export Report</Button>
          </div>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger aria-label="Analytics date range"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger aria-label="Analytics department"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {analytics.departmentScores.map((item) => <SelectItem key={item.metric} value={item.metric}>{item.metric}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger aria-label="Analytics metric"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admissions">Admissions</SelectItem>
              <SelectItem value="discharges">Discharges</SelectItem>
              <SelectItem value="procedures">Procedures</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {analytics.metrics.map((card) => (
            <GlassCard key={card.label} className="p-5">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
              <p className="mt-2 text-xs text-emerald-300">{card.change} · {card.sub}</p>
            </GlassCard>
          ))}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-white">Admissions trend</h3>
            <ResponsiveContainer width="100%" height={240} debounce={100}>
              <AreaChart data={flow}>
                <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.28} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area isAnimationActive={false} type="monotone" dataKey={metric} stroke="#0ea5e9" fill="url(#chart-fill)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-white">Department AI score</h3>
            <ResponsiveContainer width="100%" height={240} debounce={100}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Radar isAnimationActive={false} dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-cyan-300" />
              <h3 className="text-sm font-bold text-white">AI Analytics</h3>
            </div>
            {aiInsights ? (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-slate-300">{aiInsights.executiveSummary}</p>
                {aiInsights.insights.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">{item.severity}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.evidence}</p>
                  </div>
                ))}
                {aiInsights.meta.demo ? <p className="text-xs text-amber-200">Demo provider active. Configure the server OpenAI key for model-generated analysis.</p> : null}
              </div>
            ) : <p className="text-sm text-slate-400">Run AI analysis to generate operational insights from aggregate hospital metrics.</p>}
          </GlassCard>
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-300" />
              <h3 className="text-sm font-bold text-white">AI Prediction Dashboard</h3>
            </div>
            {predictions ? (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-300">{predictions.horizon}</p>
                {predictions.predictions.map((item) => (
                  <div key={item.metric} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-white">{item.metric}</p>
                      <span className="text-xs font-semibold text-violet-200">{Math.round(item.confidence * 100)}% confidence</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-white">{item.expectedValue}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.rationale}</p>
                  </div>
                ))}
                <p className="text-xs text-amber-100">{predictions.disclaimer}</p>
              </div>
            ) : <p className="text-sm text-slate-400">Generate a cautious seven-day planning forecast from current aggregate activity.</p>}
          </GlassCard>
        </div>
      </GlassCard>
    </PageShell>
  );
}
