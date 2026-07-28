import { useEffect, useState } from "react";
import { Laptop, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { useDemo } from "@/app/context/DemoContext";
import { GlassCard } from "@/app/components/common/GlassCard";
import { PageShell } from "@/app/components/common/PageShell";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { authApi } from "@/app/services/apiClient";
import type { SessionInfo } from "@/types";
import { EmptyState } from "@/app/components/common/EmptyState";
import { Skeleton } from "@/app/components/ui/skeleton";
import { translate } from "@/app/lib/i18n";
import type { SettingsState } from "@/types";

export function SettingsPage() {
  const { session, logout } = useAuth();
  const { settings, updateSettings, resetAllDemoData } = useDemo();
  const [params] = useSearchParams();
  const currentTab = params.get("tab");
  const isProfile = currentTab === "profile";
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [saving, setSaving] = useState<keyof SettingsState | null>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(settings.language, key);

  async function loadSessions() {
    try {
      setSessions(await authApi.sessions());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load active sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => { void loadSessions(); }, []);

  async function savePreference<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSaving(key);
    try {
      await updateSettings({ ...settings, [key]: value });
      toast.success(translate(key === "language" ? value as SettingsState["language"] : settings.language, "preferencesSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("preferencesError"));
    } finally {
      setSaving(null);
    }
  }

  const cards = [
    {
      label: t("theme"),
      control: (
        <Select value={settings.theme} disabled={saving === "theme"} onValueChange={(value) => void savePreference("theme", value as SettingsState["theme"])}>
          <SelectTrigger aria-label={t("theme")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">{t("dark")}</SelectItem>
            <SelectItem value="darker">{t("darker")}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      label: t("language"),
      control: (
        <Select value={settings.language} disabled={saving === "language"} onValueChange={(value) => void savePreference("language", value as SettingsState["language"])}>
          <SelectTrigger aria-label={t("language")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t("english")}</SelectItem>
            <SelectItem value="es">{t("spanish")}</SelectItem>
            <SelectItem value="bn">{t("bangla")}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <PageShell>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-white">{isProfile ? t("profile") : t("settings")}</h2>
          <p className="mt-2 text-sm text-slate-400">{t("settingsDescription")}</p>
          <div className="mt-6 grid gap-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-white">{card.label}</p>
                <div className="mt-3">{card.control}</div>
              </div>
            ))}
            <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-white">
              {t("notificationPreferences")}
              <input aria-label={t("notificationPreferences")} type="checkbox" disabled={saving === "notificationsEnabled"} checked={settings.notificationsEnabled} onChange={(event) => void savePreference("notificationsEnabled", event.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-white">
              {t("reduceAnimations")}
              <input aria-label={t("reduceAnimations")} type="checkbox" disabled={saving === "reducedMotion"} checked={settings.reducedMotion} onChange={(event) => void savePreference("reducedMotion", event.target.checked)} />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => {
              resetAllDemoData();
              toast.success("Demo data reset.");
            }}>{t("resetDemo")}</Button>
            <Button variant="destructive" onClick={() => {
              logout();
              toast.success("Logged out of demo session.");
            }}>{t("logout")}</Button>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white">{t("profileSummary")}</h3>
          <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-5">
            <p className="text-sm font-semibold text-white">{session?.user.name}</p>
            <p className="mt-1 text-sm text-slate-400">{session?.user.email}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-300">{session?.user.role}</p>
          </div>
          <div className="mt-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <h4 className="text-sm font-bold text-white">{t("activeSessions")}</h4>
            </div>
            <div className="mt-3 space-y-2">
              {sessionsLoading ? Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />) : sessions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-start gap-3">
                    <Laptop className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{item.userAgent || "Unknown device"}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.ipAddress || "Unknown IP"} · Expires {new Date(item.expiresAt).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try {
                        await authApi.revokeSession(item.id);
                        setSessions((current) => current.filter((sessionItem) => sessionItem.id !== item.id));
                        toast.success("Session revoked.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to revoke session.");
                      }
                    }}>Revoke</Button>
                  </div>
                </div>
              ))}
              {!sessionsLoading && !sessions.length ? <EmptyState compact icon={ShieldCheck} title="No active sessions" description="New authenticated devices will appear here." /> : null}
            </div>
          </div>
        </GlassCard>
      </div>
    </PageShell>
  );
}
