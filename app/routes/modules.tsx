import {
  Sparkle as Sparkles,
  Download,
  Check,
  Stack as Boxes,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { DependencyGraph } from "~/components/modules/DependencyGraph";
import { useModuleStore, type ModuleDef } from "~/stores/module-store";
import { MARKETPLACE_MODULES } from "~/data/modules";
import { moduleIcon } from "~/lib/icon-map";
import { useCopilotStore } from "~/stores/copilot-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Modules — MetaPanel" }];
}

export default function Modules() {
  const modules = useModuleStore((s) => s.modules);
  const toggle = useModuleStore((s) => s.toggle);
  const install = useModuleStore((s) => s.install);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const installed = modules.filter((m) => m.installed);
  const active = modules.filter((m) => m.active);

  return (
    <>
      <PageHeader
        title="Modules"
        description="Modül paketleri, bağımlılıklar ve marketplace."
        actions={[
          { label: "AI Scaffold", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Yeni bir 'Subscriptions' modülü scaffold et: plan, abonelik ve fatura modelleriyle.") },
        ]}
      />
      <PageBody className="space-y-5">
        <Tabs defaultValue="installed">
          <TabsList className="h-9">
            <TabsTrigger value="installed">Kurulu ({installed.length})</TabsTrigger>
            <TabsTrigger value="active">Aktif ({active.length})</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="mt-4">
            <Grid modules={installed} onToggle={toggle} />
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <Grid modules={active} onToggle={toggle} />
          </TabsContent>
          <TabsContent value="marketplace" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {MARKETPLACE_MODULES.map((m) => {
                const Icon = moduleIcon(m.icon);
                return (
                  <Card key={m.id}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-muted-foreground">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => { install(m); toast.success(`${m.name} kuruldu`); }}
                      >
                        <Download className="size-3.5" /> Kur
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Boxes className="size-4 text-muted-foreground" /> Bağımlılık Grafiği
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DependencyGraph modules={installed} />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

function Grid({ modules, onToggle }: { modules: ModuleDef[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((m) => {
        const Icon = moduleIcon(m.icon);
        return (
          <Card key={m.id} className="transition-colors hover:border-primary/30">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    <Badge variant="outline" className="font-mono text-[10px]">v{m.version}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
                <Switch checked={m.active} onCheckedChange={() => onToggle(m.id)} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">deps</span>
                {m.dependencies.length ? (
                  m.dependencies.map((d) => (
                    <Badge key={d} variant="secondary" className="font-mono text-[10px]">{d}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
                <Badge
                  variant="outline"
                  className={`ml-auto gap-1 text-[10px] ${m.active ? "text-emerald-400" : "text-muted-foreground"}`}
                >
                  {m.active && <Check className="size-2.5" />}
                  {m.active ? "aktif" : "pasif"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
