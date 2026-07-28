import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({ title, description, icon: Icon = Inbox, actionLabel, onAction, compact = false }: EmptyStateProps) {
  return (
    <div className={`rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center ${compact ? "p-6" : "p-10"}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07]">
        <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {actionLabel && onAction ? <Button variant="secondary" size="sm" className="mt-5" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
