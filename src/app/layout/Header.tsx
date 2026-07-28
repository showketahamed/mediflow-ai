import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Brain, LogOut, Menu, Search, Settings, UserCircle2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDemo } from "@/app/context/DemoContext";
import { useAuth } from "@/app/context/AuthContext";
import { cn, formatDateTime } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { dataApi } from "@/app/services/apiClient";
import type { AutomationMonitor } from "@/types";
import { EmptyState } from "@/app/components/common/EmptyState";
import { translate, type MessageKey } from "@/app/lib/i18n";

const routeTitleKeys: Record<string, MessageKey> = {
  "/dashboard": "dashboard",
  "/patients": "patientManagement",
  "/diagnostics": "diagnostics",
  "/ai-assistant": "assistant",
  "/schedule": "schedule",
  "/analytics": "analytics",
  "/settings": "settings",
  "/notifications": "notifications",
};

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const { notifications, settings, markNotificationRead, markAllNotificationsRead, deleteNotification } = useDemo();
  const t = (key: MessageKey) => translate(settings.language, key);
  const [time, setTime] = useState("08:00 AM");
  const [commandOpen, setCommandOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [automation, setAutomation] = useState<AutomationMonitor | null>(null);

  useEffect(() => {
    const updateClock = () =>
      setTime(new Intl.DateTimeFormat(settings.language === "bn" ? "bn-BD" : settings.language === "es" ? "es-ES" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    updateClock();
    const timer = window.setInterval(updateClock, 30000);
    return () => window.clearInterval(timer);
  }, [settings.language]);

  useEffect(() => {
    if (!statusOpen || session?.user.role === "PATIENT") return;
    void dataApi.automationMonitor().then(setAutomation).catch(() => setAutomation(null));
  }, [session?.user.role, statusOpen]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setNotificationOpen(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const items = useMemo(
    () => [
      { id: "dashboard", label: t("dashboard"), route: "/dashboard", type: "screen" },
      { id: "patients", label: t("patients"), route: "/patients", type: "screen" },
      { id: "schedule", label: t("schedule"), route: "/schedule", type: "screen" },
      { id: "diagnostics", label: t("diagnostics"), route: "/diagnostics", type: "screen" },
      { id: "analytics", label: t("analytics"), route: "/analytics", type: "screen" },
      ...notifications.map((notification) => ({
        id: notification.id,
        label: notification.title,
        route: "/notifications",
        type: "notification",
      })),
    ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [notifications, query, settings.language],
  );

  const unreadCount = notifications.filter((item) => !item.read).length;
  const titleKey = routeTitleKeys[location.pathname];
  const title = titleKey ? t(titleKey) : (location.pathname.startsWith("/patients/") ? t("patientDetails") : "MediFlow AI");

  return (
    <>
      <header className="app-header sticky top-0 z-20 flex min-w-0 items-center gap-2 border-b border-white/6 bg-[rgba(2,9,18,0.92)] px-3 py-3 backdrop-blur-lg sm:gap-3 sm:px-4 lg:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label={t("openMenu")}>
          <Menu className="h-5 w-5 text-slate-300" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-white">{title}</h1>
          <p className="text-xs text-slate-500">Mon, Jul 27, 2026 · {time}</p>
        </div>

        <button
          className="hidden min-h-11 flex-1 items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 text-left text-sm text-slate-400 transition hover:border-white/12 md:flex md:max-w-md"
          onClick={() => setCommandOpen(true)}
          aria-label="Open global search"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1">{t("search")}</span>
          <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-xs">Ctrl K</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/4 transition hover:border-white/12 hover:bg-white/6"
            onClick={() => setNotificationOpen((current) => !current)}
            aria-label={settings.notificationsEnabled ? t("notifications") : t("notificationsDisabled")}
            aria-expanded={notificationOpen}
            aria-controls="notification-panel"
          >
            {settings.notificationsEnabled ? <Bell className="h-4 w-4 text-slate-300" /> : <BellOff className="h-4 w-4 text-slate-500" />}
            {unreadCount ? <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500" /> : null}
          </button>
          <button
            className="hidden min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/8 px-3 text-xs font-bold text-cyan-300 transition hover:border-cyan-300/30 sm:flex"
            onClick={() => setStatusOpen(true)}
          >
            <Brain className="h-3.5 w-3.5" />
            {t("aiActive")}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-2 transition hover:border-white/12 sm:px-3" aria-label="Open account menu">
                <UserCircle2 className="h-4 w-4 text-slate-300" />
                <span className="hidden text-sm text-white sm:inline">{session?.user.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 border-white/10 bg-slate-950/95 text-slate-200">
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4" />
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings?tab=profile")}>
                <UserCircle2 className="h-4 w-4" />
                {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  toast.success("Signed out of the demo session.");
                }}
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-slate-950/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>Global command search</DialogTitle>
            <DialogDescription>Jump to screens and recently active items.</DialogDescription>
          </DialogHeader>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type to search..." />
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:border-cyan-400/20 hover:bg-white/6"
                onClick={() => {
                  navigate(item.route);
                  setCommandOpen(false);
                }}
              >
                <span className="text-sm text-white">{item.label}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.type}</span>
              </button>
            ))}
            {!items.length ? <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">No matches found.</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-xl border-white/10 bg-slate-950/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>MediFlow AI system status</DialogTitle>
            <DialogDescription>Live Redis queue, workflow, retry, and delivery health.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Queue</p>
              <p className="mt-2 text-lg font-semibold text-white">{automation ? `${automation.redis.active} active / ${automation.redis.waiting} waiting` : "Checking..."}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Success rate</p>
              <p className="mt-2 text-lg font-semibold text-white">{automation ? `${automation.successRate}%` : "Checking..."}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Delayed / retrying</p>
              <p className="mt-2 text-lg font-semibold text-white">{automation ? `${automation.redis.delayed} / ${automation.database.retrying ?? 0}` : "Checking..."}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Outbox / dead letter</p>
              <p className="mt-2 text-lg font-semibold text-white">{automation ? `${automation.outboxPending} / ${automation.database.dead_letter ?? 0}` : "Checking..."}</p>
            </div>
          </div>
          <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Clinical automation supports care teams but does not replace professional review or emergency protocols.</p>
        </DialogContent>
      </Dialog>

      <div id="notification-panel" role="region" aria-label="Recent notifications" aria-hidden={!notificationOpen} className={cn("fixed right-2 top-20 z-30 w-[min(calc(100vw-1rem),380px)] transition sm:right-4 sm:top-24", notificationOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0")}>
        <div className="rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-lg">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{t("notifications")}</p>
              <p className="text-xs text-slate-400">{unreadCount} {t("unread")}</p>
            </div>
            {settings.notificationsEnabled ? <Button variant="ghost" size="sm" onClick={markAllNotificationsRead}>{t("markAllRead")}</Button> : null}
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{notification.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{notification.body}</p>
                    <p className="mt-2 text-[11px] text-slate-500">{formatDateTime(notification.createdAt)}</p>
                  </div>
                  {!notification.read ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" /> : null}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => markNotificationRead(notification.id)}>{t("markRead")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteNotification(notification.id)}>{t("delete")}</Button>
                </div>
              </div>
            ))}
            {!notifications.length ? <EmptyState compact icon={BellOff} title={settings.notificationsEnabled ? t("noNotifications") : t("notificationsDisabled")} description={settings.notificationsEnabled ? t("noNotificationsDescription") : t("notificationsDisabledDescription")} /> : null}
          </div>
        </div>
      </div>
    </>
  );
}
