import { lazy, Suspense, useEffect, useState } from "react";
import { Activity, ArrowUpRight, Brain, Heart, Stethoscope, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDemo } from "@/app/context/DemoContext";
import { dataApi } from "@/app/services/apiClient";
import { GlassCard } from "@/app/components/common/GlassCard";
import { PageShell } from "@/app/components/common/PageShell";
import { StatusBadge } from "@/app/components/common/StatusBadge";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import type { DashboardData, Insight } from "@/types";
import { EmptyState } from "@/app/components/common/EmptyState";
import { RouteLoader } from "@/app/components/common/LoadingStates";

const emptyDashboard: DashboardData = {
  stats: { patients: 0, procedures: 0, diagnostics: 0, occupancy: 0 },
  vitalData: [],
  weeklyFlow: [],
  insights: [],
};

const VitalChart = lazy(() => import("@/app/components/dashboard/DashboardCharts").then((module) => ({ default: module.VitalChart })));
const FlowChart = lazy(() => import("@/app/components/dashboard/DashboardCharts").then((module) => ({ default: module.FlowChart })));
const chartFallback = <div className="h-[220px] animate-pulse rounded-2xl bg-white/5" aria-label="Loading chart" />;

export function DashboardPage() {
  const { patients, refreshData } = useDemo();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const loadDashboard = async () => setDashboard(await dataApi.dashboard());
  useEffect(() => {
    void loadDashboard()
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load dashboard."))
      .finally(() => setLoading(false));
  }, []);
  const stats = [
    { label: "Active Patients", value: dashboard.stats.patients.toString(), change: "Live", icon: Users, route: "/patients" },
    { label: "Procedures Today", value: dashboard.stats.procedures.toString(), change: "Live", icon: Stethoscope, route: "/schedule" },
    { label: "AI Diagnoses", value: dashboard.stats.diagnostics.toString(), change: "Live", icon: Brain, route: "/diagnostics" },
    { label: "Bed Occupancy", value: `${dashboard.stats.occupancy}%`, change: "Live", icon: Heart, route: "/analytics" },
  ];

  if (loading && !dashboard.generatedAt) return <RouteLoader />;

  return (
    <PageShell>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" disabled={loading} onClick={async () => {
          setLoading(true);
          try {
            await Promise.all([refreshData(), loadDashboard()]);
            toast.success("Dashboard metrics refreshed.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to refresh dashboard.");
          } finally {
            setLoading(false);
          }
        }}>{loading ? "Refreshing..." : "Refresh dashboard"}</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label} className="p-5" onClick={() => navigate(stat.route)} glowColor="rgba(14,165,233,0.12)">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-2xl bg-white/8 p-3"><stat.icon className="h-5 w-5 text-cyan-300" /></div>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300"><ArrowUpRight className="h-3 w-3" />{stat.change}</span>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
          </GlassCard>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <GlassCard className="xl:col-span-2 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Vitals Monitor</h2>
              <p className="text-xs text-slate-500">ICU-3 · Elena Vasquez · Last 24h</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/patients/MF-00142")}>View patient</Button>
          </div>
          <Suspense fallback={chartFallback}><VitalChart data={dashboard.vitalData} /></Suspense>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">AI Insights</h2>
              <p className="text-xs text-slate-500">Open any card for details.</p>
            </div>
            <Brain className="h-4 w-4 text-violet-300" />
          </div>
          <div className="space-y-3">
            {dashboard.insights.map((insight) => (
              <button key={insight.id} className="w-full rounded-2xl border border-white/8 bg-white/4 p-3 text-left transition hover:border-violet-400/20" onClick={() => setSelectedInsight(insight)}>
                <div className="mb-2 flex items-center justify-between">
                  <StatusBadge status={insight.type === "alert" ? "critical" : insight.type === "warning" ? "warning" : "stable"} />
                  <span className="text-xs text-slate-500">{insight.confidence}%</span>
                </div>
                <p className="text-sm text-slate-200">{insight.text}</p>
              </button>
            ))}
            {!dashboard.insights.length ? <EmptyState compact icon={Brain} title="No active insights" description="AI insights will appear as hospital activity is processed." /> : null}
          </div>
        </GlassCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-sm font-bold text-white">Weekly Flow</h2>
          <p className="mb-5 text-xs text-slate-500">Admissions vs discharges</p>
          <Suspense fallback={chartFallback}><FlowChart data={dashboard.weeklyFlow} /></Suspense>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Critical Watch</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/patients?filter=critical")}>View all</Button>
          </div>
          <div className="space-y-3">
            {patients.slice(0, 4).map((patient) => (
              <button key={patient.id} className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-3 text-left transition hover:border-cyan-400/20" onClick={() => navigate(`/patients/${patient.id}`)}>
                <div>
                  <p className="text-sm font-semibold text-white">{patient.name}</p>
                  <p className="text-xs text-slate-400">{patient.condition}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={patient.status} />
                  <p className="mt-2 text-xs text-slate-500">{patient.ward}</p>
                </div>
              </button>
            ))}
            {!patients.length ? <EmptyState compact icon={Users} title="No patients on watch" description="Critical and recently active patients will appear here." /> : null}
          </div>
        </GlassCard>
      </div>
      <Dialog open={Boolean(selectedInsight)} onOpenChange={(open) => !open && setSelectedInsight(null)}>
        <DialogContent className="border-white/10 bg-slate-950/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>Insight detail</DialogTitle>
            <DialogDescription>AI-assisted output requires professional review.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-200">{selectedInsight?.text}</p>
          <p className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-slate-300">{selectedInsight?.details}</p>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
