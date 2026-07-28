import { ArrowLeft, Compass } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PageShell } from "@/app/components/common/PageShell";
import { GlassCard } from "@/app/components/common/GlassCard";
import { Button } from "@/app/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-[#020912] p-4 text-slate-100">
      <PageShell>
        <GlassCard className="relative mx-auto max-w-2xl overflow-hidden p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute inset-x-16 top-0 h-32 bg-cyan-400/10 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10">
            <Compass className="h-7 w-7 text-cyan-300" aria-hidden="true" />
          </div>
          <p className="relative mt-6 text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">Error 404</p>
          <h1 className="relative mt-4 text-3xl font-bold text-white sm:text-4xl">This route is off the map</h1>
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">The requested MediFlow screen may have moved, or the link is no longer available.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft aria-hidden="true" /> Go back</Button>
            <Button asChild><Link to="/dashboard">Return to dashboard</Link></Button>
          </div>
        </GlassCard>
      </PageShell>
    </main>
  );
}
