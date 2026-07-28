import { Activity, Bell, Bot, Brain, Calendar, LayoutDashboard, Settings, TrendingUp, Users, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/context/AuthContext";
import { useDemo } from "@/app/context/DemoContext";
import { translate, type MessageKey } from "@/app/lib/i18n";

const navItems = [
  { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "patients", icon: Users },
  { to: "/diagnostics", label: "diagnostics", icon: Brain, badge: "AI" },
  { to: "/ai-assistant", label: "assistant", icon: Bot, badge: "AI" },
  { to: "/schedule", label: "schedule", icon: Calendar },
  { to: "/analytics", label: "analytics", icon: TrendingUp },
  { to: "/notifications", label: "notifications", icon: Bell },
  { to: "/settings", label: "settings", icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth();
  const { settings } = useDemo();
  const t = (key: MessageKey) => translate(settings.language, key);

  return (
    <>
      {open ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} /> : null}
      <aside
        aria-label="Primary navigation"
        className={cn(
          "app-sidebar",
          "fixed left-0 top-0 z-40 flex h-full w-[272px] flex-col border-r border-white/8 bg-[rgba(4,10,26,0.95)] px-4 py-6 backdrop-blur-lg transition-transform duration-300 lg:relative lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#7c3aed)]">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <Link to="/dashboard" className="min-w-0 flex-1" onClick={onClose}>
            <p className="text-sm font-bold text-white">MediFlow</p>
            <p className="bg-[linear-gradient(90deg,#0ea5e9,#a78bfa)] bg-clip-text text-xs font-bold text-transparent">AI Platform</p>
          </Link>
          <button className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.filter((item) => session?.user.role !== "PATIENT" || item.to !== "/analytics").map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                  isActive ? "border border-cyan-400/20 bg-cyan-400/12 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-4 w-4", isActive && "text-cyan-400")} />
                  <span className="flex-1">{t(item.label as MessageKey)}</span>
                  {"badge" in item && item.badge ? (
                    <span className="rounded-md bg-violet-400/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">{item.badge}</span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/6 p-3">
            <p className="text-xs font-semibold text-emerald-300">{t("online")}</p>
            <p className="mt-1 text-xs text-slate-400">{t("onlineDescription")}</p>
          </div>
          <Link to="/settings" onClick={onClose} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0ea5e9,#7c3aed)] text-sm font-bold text-white">
              {session?.user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{session?.user.name}</p>
              <p className="text-xs text-slate-400">{session?.user.title}</p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
