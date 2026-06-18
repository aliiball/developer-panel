import { useState } from "react";
import {
  Plus,
  Clock,
  CheckCircle as CheckCircle2,
  XCircle,
  CircleNotch as Loader2,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { CRON_JOBS, type CronJob } from "~/data/expansion";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Scheduler — MetaPanel" }];
}

const STATUS = {
  success: { icon: CheckCircle2, tone: "text-emerald-400", label: "başarılı" },
  failed: { icon: XCircle, tone: "text-red-400", label: "başarısız" },
  running: { icon: Loader2, tone: "text-sky-400 animate-spin", label: "çalışıyor" },
} as const;

export default function Scheduler() {
  const [jobs, setJobs] = useState<CronJob[]>(CRON_JOBS);

  function toggle(id: string) {
    setJobs((p) => p.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j)));
  }

  return (
    <>
      <PageHeader
        title="Scheduler"
        description="Zamanlanmış görevler (cron). Çizelge, sonraki çalışma ve durum."
        actions={[{ label: "Yeni Görev", icon: Plus, variant: "default", onClick: () => toast.success("Yeni cron görevi (mock)") }]}
      />
      <PageBody>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Görev</th>
                <th className="px-4 py-2.5 font-medium">Çizelge</th>
                <th className="px-4 py-2.5 font-medium">Sonraki</th>
                <th className="px-4 py-2.5 font-medium">Son durum</th>
                <th className="px-4 py-2.5 font-medium text-right">Aktif</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const s = STATUS[j.lastStatus];
                return (
                  <tr key={j.id} className="border-b last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className={cn("font-medium", !j.enabled && "text-muted-foreground")}>{j.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <code className="font-mono text-xs">{j.schedule}</code>
                        <span className="text-[11px] text-muted-foreground">{j.human}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{j.enabled ? j.nextRun : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs", s.tone)}>
                        <s.icon className="size-3.5" /> {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Switch checked={j.enabled} onCheckedChange={() => toggle(j.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-2">
          <Badge variant="secondary">{jobs.filter((j) => j.enabled).length} aktif</Badge>
          <Badge variant="secondary">{jobs.length} toplam görev</Badge>
        </div>
      </PageBody>
    </>
  );
}
