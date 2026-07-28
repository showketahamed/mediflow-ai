import { cn } from "@/app/lib/utils";

const statusStyles: Record<string, string> = {
  critical: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  warning: "border-amber-400/30 bg-amber-400/15 text-amber-200",
  stable: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
  confirmed: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
  pending: "border-cyan-400/30 bg-cyan-400/15 text-cyan-200",
  completed: "border-violet-400/30 bg-violet-400/15 text-violet-200",
  cancelled: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  running: "border-cyan-400/30 bg-cyan-400/15 text-cyan-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize", statusStyles[status])}>
      {status}
    </span>
  );
}
