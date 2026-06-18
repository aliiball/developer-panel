import { useMemo, useState } from "react";
import {
  Plus,
  Key as KeyRound,
  Copy,
  ArrowClockwise as RotateCw,
  Trash as Trash2,
  Check,
  Lock,
  WarningOctagon,
  ShieldWarning,
  Pulse as PulseIcon,
  Clock,
  GlobeHemisphereWest,
  UserCircle,
  Prohibit,
  Plugs,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SCOPE_OPTIONS } from "~/data/platform";
import {
  SEED_RICH_KEYS,
  type RichApiKey,
} from "~/data/seed.api-keys";
import {
  EmptyState,
  TableSkeleton,
  KpiSkeleton,
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "API Keys — MetaPanel" }];
}

const ENV_TONE: Record<string, string> = {
  prod: "text-emerald-400 border-emerald-500/30",
  staging: "text-amber-400 border-amber-500/30",
  dev: "text-sky-400 border-sky-500/30",
};

type EnvFilter = "all" | "prod" | "staging" | "dev";
type StatusFilter = "all" | "active" | "revoked" | "risk";

const COLS = [
  { key: "name", label: "Ad" },
  { key: "key", label: "Anahtar" },
  { key: "scope", label: "Scope" },
  { key: "usage", label: "Kullanım (24s)" },
  { key: "owner", label: "Sahip" },
  { key: "lastUsed", label: "Son kullanım" },
] as const;

const AUDIT_TONE: Record<string, AuditEvent["tone"]> = {
  created: "primary",
  rotated: "amber",
  revoked: "red",
  scope: "primary",
  used: "default",
  leak: "red",
  limit: "amber",
};
const AUDIT_ICON: Record<string, AuditEvent["icon"]> = {
  created: Plus,
  rotated: RotateCw,
  revoked: Prohibit,
  scope: ShieldWarning,
  used: PulseIcon,
  leak: WarningOctagon,
  limit: Clock,
};

function fmt(n: number) {
  return n.toLocaleString("tr-TR");
}
function maskFull(prefix: string) {
  return `${prefix}${"•".repeat(20)}`;
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<RichApiKey[]>(SEED_RICH_KEYS);
  const [loading] = useState(false);

  // filtreler
  const [search, setSearch] = useState("");
  const [env, setEnv] = useState<EnvFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // create dialog
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [newEnv, setNewEnv] = useState<"prod" | "staging" | "dev">("prod");
  const [newScopes, setNewScopes] = useState<string[]>(["read"]);
  const [created, setCreated] = useState<string | null>(null);

  // detay + onay
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "revoke" | "rotate"; id: string }>(null);

  const detail = keys.find((k) => k.id === detailId) ?? null;

  /* ── türetilmiş metrikler ─────────────────────────────────────── */
  const stats = useMemo(() => {
    const active = keys.filter((k) => !k.revoked);
    const calls24h = active.reduce((s, k) => s + k.calls24h, 0);
    const risky = keys.filter((k) => !k.revoked && k.leak).length;
    const stale = active.filter((k) => k.ageDays > 180).length;
    // hacim eğilimi: aktif anahtarların 7 günlük toplamı (gün bazında)
    const trend = Array.from({ length: 7 }, (_, d) =>
      active.reduce((s, k) => s + (k.usage7d[d] ?? 0), 0),
    );
    return { activeCount: active.length, calls24h, risky, stale, trend, total: keys.length };
  }, [keys]);

  /* ── filtreleme ───────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keys.filter((k) => {
      if (q && ![k.name, k.prefix, k.owner, ...k.scopes].join(" ").toLowerCase().includes(q))
        return false;
      if (env !== "all" && k.env !== env) return false;
      if (status === "active" && k.revoked) return false;
      if (status === "revoked" && !k.revoked) return false;
      if (status === "risk" && (!k.leak || k.revoked)) return false;
      return true;
    });
  }, [keys, search, env, status]);

  const hasFilter = search.trim() !== "" || env !== "all" || status !== "all";
  const visibleCols = (key: string) => !hidden.has(key);

  /* ── eylemler ─────────────────────────────────────────────────── */
  function toggleScope(s: string) {
    setNewScopes((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }

  function create() {
    if (!name.trim()) {
      toast.error("Anahtar adı gerekli");
      return;
    }
    const full = `mp_${newEnv === "prod" ? "live" : "test"}_sk_${Math.random()
      .toString(16)
      .slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
    const id = `k_${Date.now().toString(36)}`;
    setKeys((p) => [
      {
        id,
        name: name.trim(),
        prefix: full.slice(0, 16),
        scopes: newScopes.length ? newScopes : ["read"],
        createdAt: "az önce",
        lastUsed: "hiç",
        env: newEnv,
        revoked: false,
        usage7d: [0, 0, 0, 0, 0, 0, 0],
        calls24h: 0,
        calls30d: 0,
        rateLimit: newEnv === "prod" ? 300 : 120,
        lastIp: "—",
        lastUserAgent: "—",
        owner: "Sen",
        expiresAt: null,
        leak: null,
        ageDays: 0,
        audit: [
          {
            id: "a0",
            action: "anahtarı oluşturdu",
            actor: "Sen",
            at: "az önce",
            kind: "created",
            detail: `scope: ${(newScopes.length ? newScopes : ["read"]).join(", ")}`,
          },
        ],
      },
      ...p,
    ]);
    setCreated(full);
    setName("");
    toast.success("Anahtar oluşturuldu");
  }

  function doRotate(id: string) {
    const np = `mp_live_sk_${Math.random().toString(16).slice(2, 6)}`;
    setKeys((p) =>
      p.map((k) =>
        k.id === id
          ? {
              ...k,
              prefix: np,
              lastUsed: "hiç",
              createdAt: "az önce",
              ageDays: 0,
              leak: null,
              audit: [
                { id: `r_${Date.now()}`, action: "anahtarı yeniledi (rotate)", actor: "Sen", at: "az önce", kind: "rotated", detail: "eski sır geçersizleştirildi" },
                ...k.audit,
              ],
            }
          : k,
      ),
    );
    toast.success("Anahtar yenilendi (rotate)", { description: "Eski sır artık geçersiz." });
    setConfirm(null);
  }

  function doRevoke(id: string) {
    let prev: RichApiKey | undefined;
    setKeys((p) =>
      p.map((k) => {
        if (k.id !== id) return k;
        prev = k;
        return {
          ...k,
          revoked: true,
          audit: [
            { id: `v_${Date.now()}`, action: "anahtarı iptal etti", actor: "Sen", at: "az önce", kind: "revoked" },
            ...k.audit,
          ],
        };
      }),
    );
    toast.success("Anahtar iptal edildi", {
      description: prev?.name,
      action: {
        label: "Geri al",
        onClick: () =>
          setKeys((p) => p.map((k) => (k.id === id ? { ...k, revoked: false } : k))),
      },
    });
    setConfirm(null);
  }

  function bulkRevoke() {
    const ids = selected;
    setKeys((p) =>
      p.map((k) =>
        ids.has(k.id) && !k.revoked
          ? {
              ...k,
              revoked: true,
              audit: [
                { id: `bv_${Date.now()}_${k.id}`, action: "anahtarı iptal etti (toplu)", actor: "Sen", at: "az önce", kind: "revoked" },
                ...k.audit,
              ],
            }
          : k,
      ),
    );
    toast.success(`${ids.size} anahtar iptal edildi`);
    setSelected(new Set());
  }

  function exportData() {
    toast.success("Export hazırlandı", {
      description: `${filtered.length} anahtar JSON olarak indiriliyor (sırlar hariç).`,
    });
  }

  function toggleSel(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((p) =>
      p.size === filtered.length ? new Set() : new Set(filtered.map((k) => k.id)),
    );
  }

  /* ── render ───────────────────────────────────────────────────── */
  const detailTabs: DrawerTab[] = detail
    ? [
        {
          value: "genel",
          label: "Genel",
          content: <DetailGeneral k={detail} />,
        },
        {
          value: "aktivite",
          label: "Aktivite",
          content: (
            <AuditTimeline
              events={detail.audit.map((a) => ({
                id: a.id,
                action: a.action,
                actor: a.actor,
                at: a.at,
                detail: a.detail,
                tone: AUDIT_TONE[a.kind],
                icon: AUDIT_ICON[a.kind],
              }))}
            />
          ),
        },
        {
          value: "json",
          label: "JSON",
          content: (
            <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(
                { ...detail, audit: `${detail.audit.length} kayıt`, usage7d: detail.usage7d },
                null,
                2,
              )}
            </pre>
          ),
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="API Keys & Tokens"
        description="Anahtar yaşam döngüsü: oluştur, scope ata, rotate, revoke. Kullanım, sızıntı ve yaşlanma sinyalleriyle."
        actions={[
          {
            label: "Yeni Anahtar",
            icon: Plus,
            variant: "default",
            onClick: () => {
              setCreated(null);
              setName("");
              setNewEnv("prod");
              setNewScopes(["read"]);
              setOpen(true);
            },
          },
        ]}
      />
      <PageBody>
        {/* KPI şeridi */}
        {loading ? (
          <KpiSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Aktif anahtar"
              value={stats.activeCount}
              hint={`${stats.total} toplam`}
              delta={8}
              icon={KeyRound}
            />
            <KpiCard
              label="Çağrı (24s)"
              value={fmt(stats.calls24h)}
              delta={12}
              trend={stats.trend}
              icon={PulseIcon}
            />
            <KpiCard
              label="Risk sinyali"
              value={stats.risky}
              delta={stats.risky > 0 ? 100 : 0}
              invert
              icon={ShieldWarning}
              hint="sızıntı/anormal"
              onClick={() => setStatus(stats.risky ? "risk" : "all")}
            />
            <KpiCard
              label="Yaşlanan (>180g)"
              value={stats.stale}
              delta={stats.stale > 0 ? 5 : 0}
              invert
              icon={Clock}
              hint="rotate önerilir"
            />
          </div>
        )}

        {/* Risk şeridi */}
        {stats.risky > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
            <WarningOctagon className="mt-0.5 size-4 shrink-0" weight="regular" />
            <span>
              <b className="font-semibold">{stats.risky} anahtarda risk sinyali var.</b>{" "}
              Olası sır sızıntısı veya anormal erişim tespit edildi. İlgili anahtarları
              hemen <b>rotate</b> veya <b>revoke</b> et.{" "}
              <button
                onClick={() => setStatus("risk")}
                className="underline underline-offset-2 hover:text-red-200"
              >
                Filtreyi göster
              </button>
            </span>
          </div>
        )}

        {/* FilterBar */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Ad, prefix, sahip veya scope ara…"
          onExport={exportData}
          columns={COLS.map((c) => ({
            key: c.key,
            label: c.label,
            visible: visibleCols(c.key),
            toggle: () =>
              setHidden((p) => {
                const n = new Set(p);
                n.has(c.key) ? n.delete(c.key) : n.add(c.key);
                return n;
              }),
          }))}
        >
          {(["all", "prod", "staging", "dev"] as EnvFilter[]).map((e) => (
            <FilterChip
              key={e}
              active={env === e}
              onClick={() => setEnv(e)}
              count={e === "all" ? undefined : keys.filter((k) => k.env === e).length}
            >
              {e === "all" ? "Tüm ortamlar" : e}
            </FilterChip>
          ))}
          <span className="mx-0.5 h-4 w-px bg-border" />
          {(["all", "active", "revoked", "risk"] as StatusFilter[]).map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "all" ? "Tüm durumlar" : s === "active" ? "Aktif" : s === "revoked" ? "İptal" : "Riskli"}
            </FilterChip>
          ))}
        </FilterBar>

        {/* BulkBar */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-destructive" onClick={bulkRevoke}>
            <Prohibit className="size-3.5" /> Seçilenleri iptal et
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5"
            onClick={() => {
              toast.success(`${selected.size} anahtar export edildi`);
              setSelected(new Set());
            }}
          >
            <Copy className="size-3.5" /> Export
          </Button>
        </BulkBar>

        {/* İçerik */}
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="Henüz API anahtarı yok"
            description="İlk anahtarını oluştur ve entegrasyonlarını bağla."
            action={
              <Button className="gap-1.5" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Yeni Anahtar
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="search"
            icon={KeyRound}
            title="Eşleşen anahtar yok"
            description="Arama veya filtreleri gevşetmeyi dene."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setEnv("all");
                  setStatus("all");
                }}
              >
                Filtreleri temizle
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-9 px-3 py-2.5">
                    <Checkbox
                      checked={selected.size > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  {visibleCols("name") && <th className="px-4 py-2.5 font-medium">Ad</th>}
                  {visibleCols("key") && <th className="px-4 py-2.5 font-medium">Anahtar</th>}
                  {visibleCols("scope") && <th className="px-4 py-2.5 font-medium">Scope</th>}
                  {visibleCols("usage") && <th className="px-4 py-2.5 text-right font-medium">Kullanım (24s)</th>}
                  {visibleCols("owner") && <th className="px-4 py-2.5 font-medium">Sahip</th>}
                  {visibleCols("lastUsed") && <th className="px-4 py-2.5 font-medium">Son kullanım</th>}
                  <th className="px-4 py-2.5 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => {
                  const stale = !k.revoked && k.ageDays > 180;
                  return (
                    <tr
                      key={k.id}
                      onClick={() => setDetailId(k.id)}
                      className={cn(
                        "cursor-pointer border-b last:border-0 hover:bg-accent/30",
                        k.revoked && "opacity-50",
                        selected.has(k.id) && "bg-primary/5",
                      )}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(k.id)}
                          onCheckedChange={() => toggleSel(k.id)}
                          aria-label={`${k.name} seç`}
                        />
                      </td>
                      {visibleCols("name") && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="font-medium">{k.name}</span>
                            <Badge variant="outline" className={cn("text-[9px]", ENV_TONE[k.env])}>
                              {k.env}
                            </Badge>
                            {k.revoked && (
                              <Badge variant="secondary" className="text-[9px] text-red-400">iptal</Badge>
                            )}
                            {k.leak && !k.revoked && (
                              <span title={k.leak.source}>
                                <Badge variant="outline" className="gap-1 border-red-500/40 text-[9px] text-red-400">
                                  <WarningOctagon className="size-2.5" weight="regular" /> risk
                                </Badge>
                              </span>
                            )}
                            {stale && !k.leak && (
                              <Badge variant="outline" className="border-amber-500/40 text-[9px] text-amber-400">yaşlı</Badge>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleCols("key") && (
                        <td className="px-4 py-2.5">
                          <code className="font-mono text-xs text-muted-foreground">{k.prefix}••••</code>
                        </td>
                      )}
                      {visibleCols("scope") && (
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes.map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className={cn("text-[9px]", s === "admin" && "text-red-400", s === "deploy" && "text-amber-400")}
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      )}
                      {visibleCols("usage") && (
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {k.revoked ? "—" : fmt(k.calls24h)}
                        </td>
                      )}
                      {visibleCols("owner") && (
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{k.owner}</td>
                      )}
                      {visibleCols("lastUsed") && (
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{k.lastUsed}</td>
                      )}
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {!k.revoked ? (
                            <>
                              <button
                                onClick={() => setConfirm({ kind: "rotate", id: k.id })}
                                title="Rotate"
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                <RotateCw className="size-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirm({ kind: "revoke", id: k.id })}
                                title="Revoke"
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>

      {/* Detay Drawer */}
      <DetailDrawer
        open={!!detail}
        onOpenChange={(v) => !v && setDetailId(null)}
        title={detail?.name ?? ""}
        subtitle={detail ? `${detail.prefix}•••• · oluşturuldu ${detail.createdAt}` : undefined}
        badge={
          detail && (
            <Badge variant="outline" className={cn("text-[9px]", ENV_TONE[detail.env])}>
              {detail.env}
            </Badge>
          )
        }
        tabs={detailTabs}
        footer={
          detail &&
          !detail.revoked && (
            <div className="flex w-full gap-2 p-4">
              <Button
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => setConfirm({ kind: "rotate", id: detail.id })}
              >
                <RotateCw className="size-4" /> Rotate
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 text-destructive"
                onClick={() => setConfirm({ kind: "revoke", id: detail.id })}
              >
                <Prohibit className="size-4" /> Revoke
              </Button>
            </div>
          )
        }
      />

      {/* Onay diyaloğu (rotate / revoke) */}
      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirm?.kind === "rotate" ? (
                <RotateCw className="size-4 text-amber-400" />
              ) : (
                <WarningOctagon className="size-4 text-red-400" weight="regular" />
              )}
              {confirm?.kind === "rotate" ? "Anahtarı yenile?" : "Anahtarı iptal et?"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === "rotate"
                ? "Yeni bir sır üretilecek ve eski sır anında geçersizleşecek. Bu anahtarı kullanan tüm entegrasyonlar güncellenmeli."
                : "Bu işlem geri alınabilir değildir (toast üzerinden hızlı geri al hariç). Anahtar derhal devre dışı kalır ve istekler 401 döner."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>İptal</Button>
            <Button
              variant={confirm?.kind === "revoke" ? "destructive" : "default"}
              onClick={() =>
                confirm && (confirm.kind === "rotate" ? doRotate(confirm.id) : doRevoke(confirm.id))
              }
            >
              {confirm?.kind === "rotate" ? "Evet, yenile" : "Evet, iptal et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni anahtar diyaloğu */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni API Anahtarı</DialogTitle>
          </DialogHeader>
          {created ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                <Lock className="mt-0.5 size-4 shrink-0" />
                <span>Bu anahtar yalnızca bir kez gösterilir. Güvenli bir yere kaydet.</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
                <code className="flex-1 break-all font-mono text-xs">{created}</code>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 shrink-0"
                  onClick={() => {
                    navigator.clipboard?.writeText(created);
                    toast.success("Kopyalandı");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <Button className="w-full gap-1.5" onClick={() => setOpen(false)}>
                <Check className="size-4" /> Tamam
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Anahtar adı</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="örn. Mobile app"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && create()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ortam</Label>
                  <div className="flex gap-1.5">
                    {(["prod", "staging", "dev"] as const).map((e) => (
                      <button
                        key={e}
                        onClick={() => setNewEnv(e)}
                        className={cn(
                          "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                          newEnv === e ? cn("border-primary/40 bg-primary/10", ENV_TONE[e]) : "text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Scope'lar</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SCOPE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleScope(s)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          newScopes.includes(s)
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {newScopes.includes(s) && <Check className="mr-1 inline size-3" />}
                        {s}
                      </button>
                    ))}
                  </div>
                  {newScopes.includes("admin") && (
                    <p className="flex items-center gap-1 text-[11px] text-red-400">
                      <ShieldWarning className="size-3" /> admin scope tam erişim verir — dikkatli ata.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={create}>Oluştur</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Detay: Genel sekmesi ───────────────────────────────────────── */
function DetailGeneral({ k }: { k: RichApiKey }) {
  const stale = !k.revoked && k.ageDays > 180;
  return (
    <div className="space-y-4">
      {k.leak && !k.revoked && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
          <WarningOctagon className="mt-0.5 size-4 shrink-0" weight="regular" />
          <span>
            <b className="font-semibold">
              {k.leak.severity === "high" ? "Yüksek riskli sızıntı" : "Şüpheli erişim"}
            </b>
            <br />
            {k.leak.source} · {k.leak.at}. Bu anahtarı hemen rotate etmen önerilir.
          </span>
        </div>
      )}
      {stale && !k.leak && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span>Bu anahtar {k.ageDays} gündür rotate edilmedi. Periyodik rotasyon önerilir.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Çağrı (24s)" value={k.revoked ? "—" : fmt(k.calls24h)} />
        <Stat label="Çağrı (30g)" value={k.revoked ? "—" : fmt(k.calls30d)} />
        <Stat label="Rate limit" value={`${k.rateLimit}/dk`} />
      </div>

      <div className="divide-y rounded-lg border bg-card/40">
        <Field label="Durum">
          {k.revoked ? (
            <Badge variant="secondary" className="text-[9px] text-red-400">iptal edildi</Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 text-[9px] text-emerald-400">aktif</Badge>
          )}
        </Field>
        <Field label="Prefix" mono>{maskFull(k.prefix)}</Field>
        <Field label="Scope'lar">
          <span className="flex flex-wrap justify-end gap-1">
            {k.scopes.map((s) => (
              <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>
            ))}
          </span>
        </Field>
        <Field label="Ortam">{k.env}</Field>
        <Field label="Sahip">
          <span className="inline-flex items-center gap-1">
            <UserCircle className="size-3.5 text-muted-foreground" /> {k.owner}
          </span>
        </Field>
        <Field label="Oluşturuldu">{k.createdAt}</Field>
        <Field label="Son kullanım">{k.lastUsed}</Field>
        <Field label="Yaş">{k.ageDays} gün</Field>
        <Field label="Sona erme">{k.expiresAt ?? "—"}</Field>
        <Field label="Son IP" mono>
          <span className="inline-flex items-center gap-1">
            <GlobeHemisphereWest className="size-3.5 text-muted-foreground" /> {k.lastIp}
          </span>
        </Field>
        <Field label="Son ajan" mono>{k.lastUserAgent}</Field>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card/40 p-2 text-[11px] text-muted-foreground">
        <Plugs className="size-3.5 shrink-0" />
        Bu anahtarla yapılan istekler {k.rateLimit} req/dk ile sınırlıdır; aşımda 429 döner.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/40 p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
