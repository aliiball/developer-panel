import { useState } from "react";
import { Plus, Webhook as WebhookIcon, Circle } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { WEBHOOKS, WEBHOOK_DELIVERIES, type WebhookDef } from "~/data/expansion";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Webhooks — MetaPanel" }];
}

const STATUS_TONE = {
  active: "text-emerald-400",
  paused: "text-muted-foreground",
  failing: "text-red-400",
} as const;

export default function Webhooks() {
  const [hooks, setHooks] = useState<WebhookDef[]>(WEBHOOKS);

  function toggle(id: string) {
    setHooks((p) =>
      p.map((h) => (h.id === id ? { ...h, status: h.status === "paused" ? "active" : "paused" } : h)),
    );
  }

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Giden webhook uç noktaları ve son teslimatlar."
        actions={[{ label: "Yeni Webhook", icon: Plus, variant: "default", onClick: () => toast.success("Yeni webhook (mock)") }]}
      />
      <PageBody className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Webhook list */}
        <div className="space-y-2">
          {hooks.map((h) => (
            <Card key={h.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground">
                    <WebhookIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm">{h.url}</p>
                    <span className={cn("inline-flex items-center gap-1 text-[11px]", STATUS_TONE[h.status])}>
                      <Circle className="size-2 fill-current" /> {h.status} · {h.lastDelivery}
                    </span>
                  </div>
                  <Switch checked={h.status !== "paused"} onCheckedChange={() => toggle(h.id)} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {h.events.map((e) => (
                    <Badge key={e} variant="secondary" className="font-mono text-[10px]">{e}</Badge>
                  ))}
                  <span className={cn("ml-auto text-xs tabular-nums", h.successRate < 90 ? "text-red-400" : "text-muted-foreground")}>
                    %{h.successRate} başarı
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent deliveries */}
        <Card className="h-fit">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Son Teslimatlar</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {WEBHOOK_DELIVERIES.map((d) => {
              const ok = d.status < 400;
              return (
                <div key={d.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-xs hover:bg-accent/40">
                  <Badge variant="outline" className={cn("w-12 justify-center font-mono text-[10px]", ok ? "text-emerald-400" : "text-red-400")}>
                    {d.status}
                  </Badge>
                  <span className="flex-1 truncate font-mono">{d.event}</span>
                  <span className="text-muted-foreground">{d.time}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
