import { PageShell } from "@/app/components/common/PageShell";
import { GlassCard } from "@/app/components/common/GlassCard";
import { Button } from "@/app/components/ui/button";
import { useDemo } from "@/app/context/DemoContext";
import { formatDateTime } from "@/app/lib/utils";
import { EmptyState } from "@/app/components/common/EmptyState";
import { BellOff } from "lucide-react";
import { translate } from "@/app/lib/i18n";

export function NotificationsPage() {
  const { notifications, settings, updateSettings, markNotificationRead, markAllNotificationsRead, deleteNotification } = useDemo();
  const t = (key: Parameters<typeof translate>[1]) => translate(settings.language, key);

  return (
    <PageShell>
      <GlassCard className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{t("notificationCenter")}</h2>
            <p className="text-sm text-slate-400">{t("notificationDescription")}</p>
          </div>
          {settings.notificationsEnabled ? <Button variant="secondary" onClick={markAllNotificationsRead}>{t("markAllRead")}</Button> : null}
        </div>
        <div className="space-y-3">
          {!settings.notificationsEnabled ? <EmptyState icon={BellOff} title={t("notificationsDisabled")} description={t("notificationsDisabledDescription")} actionLabel={t("enableNotifications")} onAction={() => void updateSettings({ ...settings, notificationsEnabled: true })} /> : null}
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{notification.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{notification.body}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!notification.read ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" /> : null}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => markNotificationRead(notification.id)}>{t("markRead")}</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteNotification(notification.id)}>{t("delete")}</Button>
              </div>
            </div>
          ))}
          {settings.notificationsEnabled && !notifications.length ? <EmptyState icon={BellOff} title={t("noNotifications")} description={t("noNotificationsDescription")} /> : null}
        </div>
      </GlassCard>
    </PageShell>
  );
}
