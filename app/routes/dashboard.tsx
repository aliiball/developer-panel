import { useNavigate } from "react-router";
import { Database, Boxes, Plug, GitCommitHorizontal, Plus, Sparkles, Palette, Activity } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { StatCard, StatGrid } from "~/components/dashboard/StatCard";
import { ActivityFeed } from "~/components/dashboard/ActivityFeed";
import { InsightStrip } from "~/components/dashboard/InsightStrip";
import { DASHBOARD_STATS, MODULE_USAGE } from "~/data/metrics";
import { useCopilotStore } from "~/stores/copilot-store";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function meta() {
  return [{ title: "Dashboard — MetaPanel" }];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const openCopilot = useCopilotStore((s) => s.openRail);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Workspace'inizin genel görünümü ve son etkinlikler."
        actions={[
          { label: "Yeni Model", icon: Plus, variant: "default", onClick: () => navigate("/schema?new=1") },
          { label: "AI Copilot", icon: Sparkles, onClick: () => queuePrompt("Bu workspace'te bu hafta ne değişti, özetle.") },
          { label: "Modül Ekle", icon: Boxes, onClick: () => navigate("/modules") },
          { label: "Tema", icon: Palette, onClick: () => navigate("/theme") },
          { label: "Metrikler", icon: Activity, onClick: () => navigate("/activity") },
        ]}
      />
      <PageBody className="space-y-5">
        <InsightStrip />

        <StatGrid>
          <StatCard label="Models" value={DASHBOARD_STATS.models.value} delta={DASHBOARD_STATS.models.delta} icon={Database} spark={DASHBOARD_STATS.models.spark} to={DASHBOARD_STATS.models.to} />
          <StatCard label="Modules" value={DASHBOARD_STATS.modules.value} delta={DASHBOARD_STATS.modules.delta} icon={Boxes} spark={DASHBOARD_STATS.modules.spark} to={DASHBOARD_STATS.modules.to} />
          <StatCard label="API Endpoints" value={DASHBOARD_STATS.endpoints.value} delta={DASHBOARD_STATS.endpoints.delta} icon={Plug} spark={DASHBOARD_STATS.endpoints.spark} to={DASHBOARD_STATS.endpoints.to} />
          <StatCard label="Migrations" value={DASHBOARD_STATS.migrations.value} delta={DASHBOARD_STATS.migrations.delta} icon={GitCommitHorizontal} spark={DASHBOARD_STATS.migrations.spark} to={DASHBOARD_STATS.migrations.to} />
        </StatGrid>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Son Aktiviteler</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed limit={8} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Modül Kullanımı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              {MODULE_USAGE.map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span>{m.label}</span>
                    <span className="text-muted-foreground tabular-nums">{m.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
