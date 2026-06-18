import { useMemo, useState } from "react";
import {
  Sparkle as Sparkles,
  Plus,
  Eye,
  EyeSlash as EyeOff,
  Lock,
  HardDrives as Server,
  Copy,
  ArrowsClockwise,
  ShieldWarning,
  Key,
  WarningCircle,
  CheckCircle,
  ClockCountdown,
  Tag,
  Trash,
  ClockClockwise,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import type { EnvName } from "~/data/delivery";
import {
  SEED_ENV_VARS_RICH,
  maskValue,
  type EnvVarRich,
} from "~/data/seed.environments";
import { useCopilotStore } from "~/stores/copilot-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import {
  EmptyState,
  KpiCard,
  FilterBar,
  FilterChip,
  BulkBar,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";

export function meta() {
  return [{ title: "Environments — MetaPanel" }];
}

const ENVS: { key: EnvName; label: string; tone: string }[] = [
  { key: "dev", label: "Development", tone: "text-sky-400" },
  { key: "staging", label: "Staging", tone: "text-amber-400" },
  { key: "prod", label: "Production", tone: "text-emerald-400" },
];

type KindFilter = "all" | "secret" | "config" | "reference";

const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "secret", label: "Secret" },
  { key: "config", label: "Config" },
  { key: "reference", label: "Referans" },
];

// rotation/stale kuralı: rotateBy "geçti" ya da yaş > 90 gün riskli sayılır.
function rotationRisk(v: EnvVarRich): "ok" | "soon" | "overdue" {
  if (v.rotateBy === "Süresi geçti" || v.ageDays > 90) return "overdue";
  if (v.rotateBy && /^(\d+) gün sonra$/.test(v.rotateBy)) {
    const d = Number(v.rotateBy.match(/^(\d+)/)?.[1]);
    if (d <= 7) return "soon";
  }
  return "ok";
}

export default function Environments() {
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [env, setEnv] = useState<EnvName>("prod");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [onlyRisk, setOnlyRisk] = useState(false);
  const [onlyDrift, setOnlyDrift] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<EnvVarRich | null>(null);

  function toggleReveal(id: string) {
    setRevealed((p) => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function copyValue(v: EnvVarRich) {
    navigator.clipboard?.writeText(v.value).catch(() => {});
    toast.success(`${v.key} kopyalandı`, {
      description: v.secret ? "Gizli değer panoya alındı — dikkatli paylaşın." : undefined,
    });
  }

  // Aktif ortamın tüm kayıtları (KPI'lar bu ortam üzerinden hesaplanır).
  const envVars = useMemo(
    () => SEED_ENV_VARS_RICH.filter((v) => v.env === env),
    [env],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return envVars.filter((v) => {
      if (q && !v.key.toLowerCase().includes(q) && !v.category.toLowerCase().includes(q)) return false;
      if (kind === "secret" && !v.secret) return false;
      if (kind === "config" && v.kind !== "config") return false;
      if (kind === "reference" && v.kind !== "reference") return false;
      if (onlyRisk && rotationRisk(v) === "ok") return false;
      if (onlyDrift && v.synced) return false;
      return true;
    });
  }, [envVars, query, kind, onlyRisk, onlyDrift]);

  const kpi = useMemo(() => {
    const secrets = envVars.filter((v) => v.secret).length;
    const risky = envVars.filter((v) => rotationRisk(v) !== "ok").length;
    const drift = envVars.filter((v) => !v.synced).length;
    return { total: envVars.length, secrets, risky, drift };
  }, [envVars]);

  function clearSel() {
    setSelected(new Set());
  }
  function toggleSel(id: string) {
    setSelected((p) => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exportEnv() {
    const payload = filtered.map((v) => ({
      key: v.key,
      value: v.secret ? "***" : v.value,
      kind: v.kind,
      env: v.env,
      owner: v.owner,
    }));
    toast.success(`${payload.length} değişken export edildi`, {
      description: `${env}.env — gizli değerler maskelendi.`,
    });
  }

  const riskCount = envVars.filter((v) => rotationRisk(v) !== "ok").length;
  const driftCount = envVars.filter((v) => !v.synced).length;

  return (
    <>
      <PageHeader
        title="Environments & Secrets"
        description="Ortam değişkenleri ve gizli anahtarlar (dev / staging / prod) — rotation, drift ve audit izleme."
        actions={[
          {
            label: "AI Denetim",
            icon: Sparkles,
            onClick: () =>
              queuePrompt(
                "Eksik veya riskli ortam değişkenlerini, süresi geçmiş gizli anahtarları ve ortamlar arası drift'i bul.",
              ),
          },
          { label: "Değişken Ekle", icon: Plus, variant: "default", onClick: () => toast.success("Yeni değişken (mock)") },
        ]}
      />
      <PageBody className="space-y-4">
        <Tabs value={env} onValueChange={(v) => { setEnv(v as EnvName); clearSel(); }}>
          <TabsList className="h-9">
            {ENVS.map((e) => {
              const count = SEED_ENV_VARS_RICH.filter((v) => v.env === e.key).length;
              return (
                <TabsTrigger key={e.key} value={e.key} className="gap-1.5">
                  <Server className={cn("size-3.5", e.tone)} />
                  {e.label}
                  <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {ENVS.map((e) => (
            <TabsContent key={e.key} value={e.key} className="mt-4 space-y-4">
              {/* KPI şeridi — aktif ortam */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label="Toplam değişken"
                  value={kpi.total}
                  icon={Tag}
                  delta={3}
                  trend={[8, 9, 9, 10, 11, kpi.total]}
                  hint={e.label}
                />
                <KpiCard
                  label="Gizli anahtar"
                  value={kpi.secrets}
                  icon={Key}
                  delta={1}
                  trend={[2, 3, 3, 4, 4, kpi.secrets]}
                  hint="secret"
                />
                <KpiCard
                  label="Rotation riski"
                  value={kpi.risky}
                  icon={ShieldWarning}
                  delta={kpi.risky > 0 ? 1 : 0}
                  invert
                  trend={[0, 1, 1, 2, 2, kpi.risky]}
                  hint="< 7 gün / 90+ yaş"
                  onClick={() => setOnlyRisk((p) => !p)}
                />
                <KpiCard
                  label="Drift (uyumsuz)"
                  value={kpi.drift}
                  icon={WarningCircle}
                  delta={kpi.drift > 0 ? 2 : 0}
                  invert
                  trend={[0, 0, 1, 1, 1, kpi.drift]}
                  hint="deploy ≠ env"
                  onClick={() => setOnlyDrift((p) => !p)}
                />
              </div>

              {/* Filtre şeridi */}
              <FilterBar
                search={query}
                onSearch={setQuery}
                placeholder="Anahtar veya kategori ara…"
                onExport={exportEnv}
              >
                {KIND_FILTERS.map((k) => (
                  <FilterChip
                    key={k.key}
                    active={kind === k.key}
                    onClick={() => setKind(k.key)}
                  >
                    {k.label}
                  </FilterChip>
                ))}
                <FilterChip active={onlyRisk} onClick={() => setOnlyRisk((p) => !p)} count={riskCount}>
                  Rotation riski
                </FilterChip>
                <FilterChip active={onlyDrift} onClick={() => setOnlyDrift((p) => !p)} count={driftCount}>
                  Drift
                </FilterChip>
              </FilterBar>

              {/* Toplu işlem şeridi */}
              <BulkBar count={selected.size} onClear={clearSel}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    toast.success(`${selected.size} anahtar rotate edildi (mock)`);
                    clearSel();
                  }}
                >
                  <ArrowsClockwise className="size-3.5" /> Rotate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    toast.success(`${selected.size} değişken export edildi`);
                  }}
                >
                  <Copy className="size-3.5" /> .env kopyala
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    toast.success(`${selected.size} değişken silindi (mock)`);
                    clearSel();
                  }}
                >
                  <Trash className="size-3.5" /> Sil
                </Button>
              </BulkBar>

              {/* İçerik */}
              {filtered.length === 0 ? (
                envVars.length === 0 ? (
                  <EmptyState
                    icon={Server}
                    title="Bu ortamda değişken yok"
                    description="Bu ortam için henüz bir değişken veya gizli anahtar tanımlanmamış."
                    action={
                      <Button size="sm" className="gap-1.5" onClick={() => toast.success("Yeni değişken (mock)")}>
                        <Plus className="size-3.5" /> Değişken Ekle
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    variant="search"
                    icon={Server}
                    title="Eşleşen değişken yok"
                    description="Arama veya filtre kriterlerine uyan kayıt bulunamadı."
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuery("");
                          setKind("all");
                          setOnlyRisk(false);
                          setOnlyDrift(false);
                        }}
                      >
                        Filtreleri temizle
                      </Button>
                    }
                  />
                )
              ) : (
                <EnvTable
                  vars={filtered}
                  revealed={revealed}
                  selected={selected}
                  onToggleReveal={toggleReveal}
                  onToggleSel={toggleSel}
                  onCopy={copyValue}
                  onOpen={setActive}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </PageBody>

      <VarDrawer
        v={active}
        revealed={active ? revealed.has(active.id) : false}
        onToggleReveal={toggleReveal}
        onOpenChange={(o) => !o && setActive(null)}
        onCopy={copyValue}
      />
    </>
  );
}

/* ── Tablo ──────────────────────────────────────────────────────────── */

function RiskBadge({ v }: { v: EnvVarRich }) {
  const r = rotationRisk(v);
  if (r === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <CheckCircle className="size-3 text-emerald-400" weight="regular" /> sağlıklı
      </span>
    );
  }
  if (r === "soon") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
        <ClockCountdown className="size-3" weight="regular" /> {v.rotateBy}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
      <ShieldWarning className="size-3" weight="regular" /> rotate gerekli
    </span>
  );
}

function EnvTable({
  vars,
  revealed,
  selected,
  onToggleReveal,
  onToggleSel,
  onCopy,
  onOpen,
}: {
  vars: EnvVarRich[];
  revealed: Set<string>;
  selected: Set<string>;
  onToggleReveal: (id: string) => void;
  onToggleSel: (id: string) => void;
  onCopy: (v: EnvVarRich) => void;
  onOpen: (v: EnvVarRich) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="w-9 px-3 py-2.5" />
            <th className="px-4 py-2.5 font-medium">Anahtar</th>
            <th className="px-4 py-2.5 font-medium">Değer</th>
            <th className="px-4 py-2.5 font-medium">Kategori</th>
            <th className="px-4 py-2.5 font-medium">Durum</th>
            <th className="px-4 py-2.5 text-right font-medium">Güncelleme</th>
          </tr>
        </thead>
        <tbody>
          {vars.map((v) => {
            const show = revealed.has(v.id) || !v.secret;
            const isSel = selected.has(v.id);
            return (
              <tr
                key={v.id}
                onClick={() => onOpen(v)}
                className={cn(
                  "cursor-pointer border-b last:border-0 hover:bg-accent/30",
                  isSel && "bg-primary/5",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => onToggleSel(v.id)}
                    aria-label={`${v.key} seç`}
                    className="size-3.5 accent-primary"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                    {v.secret && <Lock className="size-3 text-amber-400" />}
                    {v.key}
                  </span>
                  {!v.synced && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-red-400">
                      <WarningCircle className="size-3" /> drift
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <code className="max-w-[18rem] truncate font-mono text-xs text-muted-foreground">
                      {show ? v.value : maskValue(v.value, true)}
                    </code>
                    {v.secret && (
                      <button
                        onClick={() => onToggleReveal(v.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={show ? "Gizle" : "Göster"}
                      >
                        {revealed.has(v.id) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => onCopy(v)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Kopyala"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className="text-[10px]">{v.category}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <RiskBadge v={v} />
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{v.updatedAt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── DetailDrawer ───────────────────────────────────────────────────── */

function VarDrawer({
  v,
  revealed,
  onToggleReveal,
  onOpenChange,
  onCopy,
}: {
  v: EnvVarRich | null;
  revealed: boolean;
  onToggleReveal: (id: string) => void;
  onOpenChange: (o: boolean) => void;
  onCopy: (v: EnvVarRich) => void;
}) {
  if (!v) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} title="" />;
  }

  const show = revealed || !v.secret;
  const r = rotationRisk(v);

  const events: AuditEvent[] = v.history.map((h) => ({
    id: h.id,
    action: h.action,
    actor: h.actor,
    at: h.at,
    detail: h.diff,
    tone: h.tone,
    icon:
      h.tone === "red"
        ? ShieldWarning
        : h.tone === "amber"
          ? ClockCountdown
          : h.tone === "emerald"
            ? CheckCircle
            : h.tone === "primary"
              ? ClockClockwise
              : Eye,
  }));

  const general = (
    <div className="divide-y">
      <Field label="Anahtar" mono>{v.key}</Field>
      <Field label="Değer" mono>
        <span className="inline-flex items-center gap-2">
          <span className="max-w-[14rem] truncate">
            {show ? v.value : maskValue(v.value, true)}
          </span>
          {v.secret && (
            <button
              onClick={() => onToggleReveal(v.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={show ? "Gizle" : "Göster"}
            >
              {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          )}
          <button
            onClick={() => onCopy(v)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Kopyala"
          >
            <Copy className="size-3.5" />
          </button>
        </span>
      </Field>
      <Field label="Tip">
        <Badge variant="secondary" className={cn("text-[10px]", v.secret && "text-amber-400")}>
          {v.kind}
        </Badge>
      </Field>
      <Field label="Kategori">{v.category}</Field>
      <Field label="Ortam">{v.env}</Field>
      <Field label="Sahip">{v.owner}</Field>
      <Field label="Yaş">{v.ageDays} gün</Field>
      <Field label="Rotation">
        {v.rotateBy ? (
          <span className={cn(r === "overdue" ? "text-red-400" : r === "soon" ? "text-amber-400" : "")}>
            {v.rotateBy}
          </span>
        ) : (
          <span className="text-muted-foreground">gerekmez</span>
        )}
      </Field>
      <Field label="Deploy uyumu">
        {v.synced ? (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <CheckCircle className="size-3.5" weight="regular" /> eşitli
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-400">
            <WarningCircle className="size-3.5" weight="regular" /> drift
          </span>
        )}
      </Field>
      <Field label="Son güncelleme">{v.updatedAt}</Field>
    </div>
  );

  const json = (
    <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(
        {
          key: v.key,
          value: v.secret ? "***" : v.value,
          kind: v.kind,
          secret: v.secret,
          env: v.env,
          category: v.category,
          owner: v.owner,
          ageDays: v.ageDays,
          rotateBy: v.rotateBy,
          synced: v.synced,
        },
        null,
        2,
      )}
    </pre>
  );

  const tabs: DrawerTab[] = [
    { value: "general", label: "Genel", content: general },
    { value: "activity", label: "Aktivite", content: <AuditTimeline events={events} /> },
    { value: "json", label: "JSON", content: json },
  ];

  return (
    <DetailDrawer
      open={!!v}
      onOpenChange={onOpenChange}
      title={v.key}
      subtitle={`${v.env} · ${v.category} · ${v.owner}`}
      badge={
        v.secret ? (
          <Badge variant="secondary" className="text-[10px] text-amber-400">secret</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">{v.kind}</Badge>
        )
      }
      tabs={tabs}
      footer={
        <div className="flex w-full items-center gap-2 p-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onCopy(v)}>
            <Copy className="size-3.5" /> Değeri kopyala
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => toast.success(`${v.key} rotate edildi (mock)`)}
          >
            <ArrowsClockwise className="size-3.5" /> Rotate
          </Button>
        </div>
      }
    />
  );
}
