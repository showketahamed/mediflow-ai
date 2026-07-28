import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { GlassCard } from "@/app/components/common/GlassCard";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#020912] p-4 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="ambient-float absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-cyan-500/20 blur-[110px]" />
        <div className="ambient-float absolute bottom-[-120px] right-[-120px] h-[320px] w-[320px] rounded-full bg-violet-500/20 blur-[110px] [animation-delay:-6s]" />
      </div>
      <GlassCard className="relative w-full max-w-md p-6 sm:p-8">
        <Link to="/" className="mb-6 flex items-center gap-3" aria-label="MediFlow AI home">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#7c3aed)]">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">MediFlow</p>
            <p className="text-xs text-cyan-300">AI Platform</p>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 text-sm text-slate-400">{footer}</div>
      </GlassCard>
    </main>
  );
}
