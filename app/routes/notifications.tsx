import { useNavigate } from "react-router";
import {
  RocketLaunch as Rocket,
  Warning as AlertTriangle,
  Bug,
  At as AtSign,
  Sparkle as Sparkles,
  Checks as CheckCheck,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useNotificationStore } from "~/stores/notification-store";
import type { NotificationType } from "~/data/platform";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Notifications — MetaPanel" }];
}

const ICON: Record<NotificationType, typeof Rocket> = {
  deploy: Rocket, incident: AlertTriangle, issue: Bug, mention: AtSign, ai: Sparkles,
};
const TONE: Record<NotificationType, string> = {
  deploy: "text-sky-400 bg-sky-400/10", incident: "text-red-400 bg-red-400/10",
  issue: "text-amber-400 bg-amber-400/10", mention: "text-violet-400 bg-violet-400/10",
  ai: "text-primary bg-primary/10",
};

export default function Notifications() {
  const navigate = useNavigate();
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread} okunmamış bildirim. Deploy, incident, issue ve mention'lar.`}
        actions={[{ label: "Tümünü Okundu İşaretle", icon: CheckCheck, onClick: markAllRead }]}
      />
      <PageBody>
        <div className="mx-auto max-w-2xl space-y-1.5">
          {notifications.map((n) => {
            const Icon = ICON[n.type];
            return (
              <button
                key={n.id}
                onClick={() => { markRead(n.id); navigate(n.link); }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent/40",
                  !n.read && "border-primary/20 bg-primary/[0.03]",
                )}
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE[n.type])}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{n.at}</span>
              </button>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
