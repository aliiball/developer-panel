import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Sparkle as Sparkles,
  Plus,
  Flag as FlagIcon,
  Lightbulb,
  ToggleRight,
  ToggleLeft,
  ChartLineUp,
  Warning,
  Broadcast,
  ArrowsClockwise,
  Power,
  PencilSimple,
  Clock,
  GitBranch,
  Trash,
  Sliders,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SEED_FLAGS, type FeatureFlag, type EnvName } from "~/data/delivery";
import { FLAG_AUDIT, FLAG_OWNERS, type FlagOwnerMeta } from "~/data/seed.flags";
import { useCopilotStore } from "~/stores/copilot-store";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  KpiCard,
  FilterBar,
  FilterChip,
  BulkBar,
  EmptyState,
  TableSkeleton,
  KpiSkeleton,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Feature Flags — MetaPanel" }];
}

const ALL_ENVS: EnvName[] = ["dev", "staging", "prod"];
const ENV_LABEL: Record<EnvName, string> = { dev: "Development", staging: "Staging", prod: "Production" };
const ENV_TONE: Record<string, string> = { dev: "text-sky-400", staging: "text-amber-400", prod: "text-emerald-400" };
const ENV_DOT: Record<string, string> = { dev: "bg-sky-400", staging: "bg-amber-400", prod: "bg-emerald-400" };

type RiskLevel = "low" | "medium" | "high";
const RISK_TONE: Record<RiskLevel, string> = {
  low: "text-emerald-400 border-emerald-500/30",
  medium: "text-amber-400 border-amber-500/30",
  high: "text-red-400 border-red-500/30",
};
const RISK_LABEL: Record<RiskLevel, string> = { low: "Düşük risk", medium: "Orta risk", high: "Yüksek risk" };

// Bir flag'in risk seviyesi: prod kapsamı + %100 rollout yüksek riskli.
function riskOf(f: FeatureFlag): RiskLevel {
  const inProd = f.envs.includes("prod");
  if (inProd && f.enabled && f.rolloutPct === 100) return "high";
  if (inProd && f.enabled) return "medium";
  return "low";
}

type StatusKind = "full" | "gradual" | "off";
function statusOf(f: FeatureFlag): StatusKind {
  if (!f.enabled) return "off";
  if (f.rolloutPct >= 100) return "full";
  return "gradual";
}

const AUDIT_ICON: Record<string, AuditEvent["icon"]> = {
  enabled: Power, disabled: Power, rollout: ChartLineUp, env: GitBranch, created: Plus, edited: PencilSimple,
};

export default function Flags() {
  const [flags, setFlags] = useState<FeatureFlag[]>(SEED_FLAGS);
  const [loading] = useState(false);
  const [query, setQuery] = useState("");
  const [envFilter, setEnvFilter] = useState<EnvName | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusKind | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [pending, setPending] = useState<Record<string, true>>({});
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // ── KPI ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const enabled = flags.filter((f) => f.enabled).length;
    const gradual = flags.filter((f) => statusOf(f) === "gradual").length;
    const prodLive = flags.filter((f) => f.enabled && f.envs.includes("prod")).length;
    const highRisk = flags.filter((f) => riskOf(f) === "high").length;
    const avgRollout = flags.length
      ? Math.round(flags.filter((f) => f.enabled).reduce((a, f) => a + f.rolloutPct, 0) / Math.max(enabled, 1))
      : 0;
    return { total: flags.length, enabled, gradual, prodLive, highRisk, avgRollout };
  }, [flags]);

  // ── Filtreleme ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flags.filter((f) => {
      if (q && !f.key.toLowerCase().includes(q) && !f.description.toLowerCase().includes(q)) return false;
      if (envFilter !== "all" && !f.envs.includes(envFilter)) return false;
      if (statusFilter !== "all" && statusOf(f) !== statusFilter) return false;
      return true;
    });
  }, [flags, query, envFilter, statusFilter]);

  const hasFilters = query.trim() !== "" || envFilter !== "all" || statusFilter !== "all";

  // ── Mutasyonlar (optimistic) ─────────────────────────────────────
  function toggle(id: string) {
    setFlags((p) =>
      p.map((f) =>
        f.id === id
          ? { ...f, enabled: !f.enabled, rolloutPct: !f.enabled ? f.rolloutPct || 100 : f.rolloutPct, updatedAt: "az önce" }
          : f,
      ),
    );
    const f = flags.find((x) => x.id === id);
    if (f) {
      const next = !f.enabled;
      if (next && riskOf({ ...f, enabled: true }) === "high") {
        toast.warning(`${f.key} prod'da %100 açıldı`, { description: "Yüksek riskli; kademeli rollout önerilir." });
      } else {
        toast.success(`${f.key} ${next ? "açıldı" : "kapatıldı"}`, {
          action: { label: "Geri al", onClick: () => toggle(id) },
        });
      }
    }
  }

  function setRollout(id: string, pct: number) {
    setFlags((p) => p.map((f) => (f.id === id ? { ...f, rolloutPct: pct, updatedAt: "az önce" } : f)));
  }

  function commitRollout(id: string, pct: number) {
    setPending((p) => ({ ...p, [id]: true }));
    const f = flags.find((x) => x.id === id);
    // Optimistic: kısa "yayılıyor" durumu simülasyonu.
    setTimeout(() => {
      setPending((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
      if (f) toast.success(`${f.key} rollout → %${pct}`, { description: "Kademeli dağıtım güncellendi." });
    }, 450);
  }

  function toggleEnv(id: string, env: EnvName) {
    setFlags((p) =>
      p.map((f) =>
        f.id === id
          ? { ...f, envs: f.envs.includes(env) ? f.envs.filter((e) => e !== env) : [...f.envs, env], updatedAt: "az önce" }
          : f,
      ),
    );
  }

  function createFlag() {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) return;
    setFlags((p) => [
      { id: `f${Date.now()}`, key, description: newDesc.trim() || "—", enabled: false, rolloutPct: 0, envs: ["dev"], updatedAt: "az önce" },
      ...p,
    ]);
    setCreateOpen(false);
    setNewKey("");
    setNewDesc("");
    toast.success(`Flag oluşturuldu: ${key}`, { description: "dev ortamında, kapalı başlatıldı." });
  }

  // ── Toplu işlemler ───────────────────────────────────────────────
  function bulkSet(enabled: boolean) {
    setFlags((p) => p.map((f) => (selected.has(f.id) ? { ...f, enabled, rolloutPct: enabled ? f.rolloutPct || 100 : f.rolloutPct, updatedAt: "az önce" } : f)));
    toast.success(`${selected.size} flag ${enabled ? "açıldı" : "kapatıldı"}`);
    setSelected(new Set());
  }
  function bulkDelete() {
    setFlags((p) => p.filter((f) => !selected.has(f.id)));
    toast.success(`${selected.size} flag silindi`);
    setSelected(new Set());
  }

  function exportJson() {
    toast.success("Flag yapılandırması dışa aktarıldı", { description: `${filtered.length} kayıt · JSON (mock)` });
  }

  const openFlag = openId ? flags.find((f) => f.id === openId) ?? null : null;
  const allSelected = filtered.length > 0 && filtered.every((f) => selected.has(f.id));

  return (
    <>
      <PageHeader
        title="Feature Flags"
        description="Özellik bayrakları: on/off, kademeli rollout ve ortam kapsamı. 'Deploy edildi' ile 'kullanıcıya açık'ı ayırır."
        actions={[
          { label: "AI Kontrol", icon: Sparkles, onClick: () => queuePrompt("Riskli feature flag'leri %100'e almadan önce kontrol et ve kullanılmayanları öner.") },
          { label: "Yeni Flag", icon: Plus, variant: "default", onClick: () => setCreateOpen(true) },
        ]}
      />
      <PageBody className="space-y-4">
        {/* KPI şeridi */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Aktif flag"
              value={`${stats.enabled}/${stats.total}`}
              delta={12}
              trend={[3, 4, 4, 5, 5, 6, stats.enabled]}
              icon={ToggleRight}
              hint="açık"
            />
            <KpiCard
              label="Kademeli rollout"
              value={stats.gradual}
              delta={8}
              trend={[1, 1, 2, 2, 1, 2, stats.gradual]}
              icon={ChartLineUp}
              hint="< %100"
            />
            <KpiCard
              label="Prod'da canlı"
              value={stats.prodLive}
              delta={5}
              trend={[1, 2, 2, 2, 3, 3, stats.prodLive]}
              icon={Broadcast}
              hint="production"
            />
            <KpiCard
              label="Yüksek risk"
              value={stats.highRisk}
              delta={stats.highRisk > 0 ? 100 : 0}
              invert
              trend={[0, 0, 1, 1, 0, 1, stats.highRisk]}
              icon={Warning}
              hint="prod · %100"
            />
          </div>
        )}

        {/* FilterBar */}
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Flag anahtarı veya açıklama ara…"
          onExport={exportJson}
        >
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} count={flags.length}>
            Tümü
          </FilterChip>
          <FilterChip active={statusFilter === "full"} onClick={() => setStatusFilter("full")} count={flags.filter((f) => statusOf(f) === "full").length}>
            Tam açık
          </FilterChip>
          <FilterChip active={statusFilter === "gradual"} onClick={() => setStatusFilter("gradual")} count={flags.filter((f) => statusOf(f) === "gradual").length}>
            Kademeli
          </FilterChip>
          <FilterChip active={statusFilter === "off"} onClick={() => setStatusFilter("off")} count={flags.filter((f) => statusOf(f) === "off").length}>
            Kapalı
          </FilterChip>
          <span className="mx-0.5 h-4 w-px bg-border" />
          <FilterChip active={envFilter === "all"} onClick={() => setEnvFilter("all")}>
            Tüm ortamlar
          </FilterChip>
          {ALL_ENVS.map((e) => (
            <FilterChip
              key={e}
              active={envFilter === e}
              onClick={() => setEnvFilter(e)}
              count={flags.filter((f) => f.envs.includes(e)).length}
            >
              {e}
            </FilterChip>
          ))}
        </FilterBar>

        {/* BulkBar */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => bulkSet(true)}>
            <Power className="size-3.5" /> Aç
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => bulkSet(false)}>
            <Power className="size-3.5" /> Kapat
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-red-400 hover:text-red-300" onClick={bulkDelete}>
            <Trash className="size-3.5" /> Sil
          </Button>
        </BulkBar>

        {/* Liste başlığı + tümünü seç */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <button
              onClick={() => setSelected(allSelected ? new Set() : new Set(filtered.map((f) => f.id)))}
              className="rounded border px-2 py-0.5 hover:bg-accent"
            >
              {allSelected ? "Seçimi kaldır" : "Tümünü seç"}
            </button>
            <span className="tabular-nums">{filtered.length} flag · ort. rollout %{stats.avgRollout}</span>
          </div>
        )}

        {/* İçerik */}
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState
              variant="search"
              icon={FlagIcon}
              title="Eşleşen flag yok"
              description="Arama veya filtreleri değiştirip tekrar deneyin."
              action={
                <Button variant="outline" size="sm" onClick={() => { setQuery(""); setEnvFilter("all"); setStatusFilter("all"); }}>
                  Filtreleri temizle
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FlagIcon}
              title="Henüz feature flag yok"
              description="İlk bayrağı oluşturun ve özelliği deploy'dan ayrı kontrol edin."
              action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Yeni Flag</Button>}
            />
          )
        ) : (
          <div className="space-y-3">
            {filtered.map((f) => {
              const risk = riskOf(f);
              const sel = selected.has(f.id);
              const busy = !!pending[f.id];
              return (
                <Card key={f.id} className={cn(sel && "border-primary/40 ring-1 ring-primary/20")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() =>
                          setSelected((p) => {
                            const n = new Set(p);
                            n.has(f.id) ? n.delete(f.id) : n.add(f.id);
                            return n;
                          })
                        }
                        aria-label={`${f.key} seç`}
                        className="mt-1.5 size-3.5 cursor-pointer accent-[var(--primary)]"
                      />
                      <button
                        onClick={() => setOpenId(f.id)}
                        className={cn("mt-0.5 flex size-8 items-center justify-center rounded-lg", f.enabled ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground")}
                        aria-label="Detay"
                      >
                        <FlagIcon className="size-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => setOpenId(f.id)} className="text-left">
                            <code className="font-mono text-sm font-medium hover:underline">{f.key}</code>
                          </button>
                          <Badge variant="outline" className={cn("text-[9px]", RISK_TONE[risk])}>{RISK_LABEL[risk]}</Badge>
                          {f.envs.map((e) => (
                            <Badge key={e} variant="outline" className={cn("text-[9px]", ENV_TONE[e])}>{e}</Badge>
                          ))}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          {f.linkedFeature && (
                            <Link to="/roadmap" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Lightbulb className="size-3" /> {f.linkedFeature}
                            </Link>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" /> {f.updatedAt}
                          </span>
                          {FLAG_OWNERS[f.id] && (
                            <span className="inline-flex items-center gap-1">
                              {FLAG_OWNERS[f.id].owner}
                            </span>
                          )}
                        </div>
                      </div>
                      <Switch checked={f.enabled} onCheckedChange={() => toggle(f.id)} aria-label={`${f.key} aç/kapat`} />
                    </div>

                    {/* Kademeli rollout slider */}
                    <div className={cn("mt-3 flex items-center gap-3 transition-opacity", !f.enabled && "opacity-40 pointer-events-none")}>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Sliders className="size-3" /> Rollout
                      </span>
                      <input
                        type="range" min={0} max={100} step={5} value={f.rolloutPct}
                        onChange={(e) => setRollout(f.id, Number(e.target.value))}
                        onPointerUp={(e) => commitRollout(f.id, Number((e.target as HTMLInputElement).value))}
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-accent accent-[var(--primary)]"
                        aria-label={`${f.key} rollout yüzdesi`}
                      />
                      {busy ? (
                        <span className="inline-flex w-12 items-center justify-end gap-1 text-[11px] text-primary">
                          <ArrowsClockwise className="size-3 animate-spin" />
                        </span>
                      ) : (
                        <span className="w-12 text-right font-mono text-xs tabular-nums">{f.rolloutPct}%</span>
                      )}
                    </div>

                    {/* Hızlı rollout adımları */}
                    {f.enabled && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {[0, 25, 50, 75, 100].map((p) => (
                          <button
                            key={p}
                            onClick={() => { setRollout(f.id, p); commitRollout(f.id, p); }}
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] tabular-nums transition-colors",
                              f.rolloutPct === p ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
                            )}
                          >
                            %{p}
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageBody>

      {/* DetailDrawer */}
      <DetailDrawer
        open={!!openFlag}
        onOpenChange={(v) => !v && setOpenId(null)}
        title={openFlag ? <code className="font-mono text-base">{openFlag.key}</code> : ""}
        subtitle={openFlag?.description}
        badge={
          openFlag ? (
            <Badge variant="outline" className={cn("text-[10px]", RISK_TONE[riskOf(openFlag)])}>
              {RISK_LABEL[riskOf(openFlag)]}
            </Badge>
          ) : undefined
        }
        tabs={openFlag ? buildTabs(openFlag, toggle, toggleEnv) : undefined}
        footer={
          openFlag ? (
            <div className="flex w-full items-center gap-2 p-3">
              <Button
                variant={openFlag.enabled ? "outline" : "default"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => toggle(openFlag.id)}
              >
                {openFlag.enabled ? <ToggleLeft className="size-4" /> : <ToggleRight className="size-4" />}
                {openFlag.enabled ? "Kapat" : "Aç"}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => queuePrompt(`${openFlag.key} flag'inin etki analizini ve rollout önerisini ver.`)}>
                <Sparkles className="size-4" /> AI
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Yeni Flag dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Anahtar</label>
              <input
                autoFocus
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="örn. new_dashboard"
                className="h-9 w-full rounded-lg border bg-card px-3 font-mono text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Açıklama</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Bu bayrak neyi kontrol ediyor?"
                className="h-9 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Yeni flag <span className="font-medium text-foreground">dev</span> ortamında, <span className="font-medium text-foreground">kapalı</span> ve %0 rollout ile başlar.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button size="sm" onClick={createFlag} disabled={!newKey.trim()}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── DetailDrawer sekmeleri ──────────────────────────────────────────
function buildTabs(
  f: FeatureFlag,
  toggle: (id: string) => void,
  toggleEnv: (id: string, env: EnvName) => void,
): DrawerTab[] {
  const owner: FlagOwnerMeta | undefined = FLAG_OWNERS[f.id];
  const audit = (FLAG_AUDIT[f.id] ?? []).map((a) => ({ ...a, icon: a.icon ?? AUDIT_ICON[a.kind] ?? undefined }));
  const effectivePct = f.enabled ? f.rolloutPct : 0;

  return [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Etkin rollout</span>
              <span className="font-mono text-sm tabular-nums">{effectivePct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${effectivePct}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {f.enabled
                ? `Kullanıcıların ~%${effectivePct}'i bu özelliği görüyor.`
                : "Flag kapalı; hiçbir kullanıcı görmüyor."}
            </p>
          </div>

          <div className="divide-y">
            <Field label="Anahtar" mono>{f.key}</Field>
            <Field label="Durum">
              <Badge variant="outline" className={cn("text-[10px]", f.enabled ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground")}>
                {f.enabled ? "Açık" : "Kapalı"}
              </Badge>
            </Field>
            <Field label="Risk">
              <Badge variant="outline" className={cn("text-[10px]", RISK_TONE[riskOf(f)])}>{RISK_LABEL[riskOf(f)]}</Badge>
            </Field>
            {owner && <Field label="Sahip">{owner.owner} · {owner.team}</Field>}
            {f.linkedFeature && (
              <Field label="Bağlı talep">
                <Link to="/roadmap" className="text-primary hover:underline">{f.linkedFeature}</Link>
              </Field>
            )}
            {owner && <Field label="Son 24s değerlendirme" mono>{owner.evals24h.toLocaleString("tr-TR")}</Field>}
            <Field label="Son güncelleme">{f.updatedAt}</Field>
          </div>

          {/* Ortam matrisi */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Ortam kapsamı</p>
            <div className="space-y-1.5">
              {ALL_ENVS.map((e) => {
                const on = f.envs.includes(e);
                return (
                  <div key={e} className="flex items-center justify-between rounded-lg border bg-card/40 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm">
                      <span className={cn("size-2 rounded-full", on ? ENV_DOT[e] : "bg-muted")} />
                      {ENV_LABEL[e]}
                      <span className={cn("text-[10px]", ENV_TONE[e])}>{e}</span>
                    </span>
                    <Switch checked={on} onCheckedChange={() => toggleEnv(f.id, e)} aria-label={`${e} ortamı`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={f.enabled ? "outline" : "default"}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => toggle(f.id)}
            >
              <Power className="size-4" /> {f.enabled ? "Kapat" : "Aç"}
            </Button>
          </div>
        </div>
      ),
    },
    {
      value: "activity",
      label: "Aktivite",
      content: <AuditTimeline events={audit} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-card/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(
            {
              id: f.id,
              key: f.key,
              enabled: f.enabled,
              rolloutPct: f.rolloutPct,
              envs: f.envs,
              linkedFeature: f.linkedFeature ?? null,
              risk: riskOf(f),
              updatedAt: f.updatedAt,
            },
            null,
            2,
          )}
        </pre>
      ),
    },
  ];
}
