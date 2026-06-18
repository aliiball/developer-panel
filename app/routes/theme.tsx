import { useEffect, useMemo, useState } from "react";
import {
  ArrowCounterClockwise as RotateCcw,
  Sparkle as Sparkles,
  Warning as AlertTriangle,
  MagicWand as Wand2,
  FloppyDisk as Save,
  Palette,
  ShieldCheck,
  Eye,
  Drop,
  Lightning,
  CheckCircle,
  XCircle,
  PencilSimple,
  ClockCounterClockwise,
  Swatches,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { ContrastBadge } from "~/components/theme/ContrastBadge";
import { TokenExport } from "~/components/theme/TokenExport";
import { useThemeStore, type BrandColors, DEFAULT_BRAND } from "~/stores/theme-store";
import { useTheme } from "~/components/shell/ThemeProvider";
import { contrastRatio, suggestAccessible, wcagLevel, bestTextOn } from "~/lib/contrast";
import { brandToTokensJson } from "~/lib/codegen";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  KpiCard,
  FilterBar,
  FilterChip,
  EmptyState,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Theme — MetaPanel" }];
}

/* ── Token metadata (page-local seed) ─────────────────────────────── */
type TokenGroup = "Marka" | "Durum" | "Nötr";

const SWATCHES: {
  key: keyof BrandColors;
  label: string;
  group: TokenGroup;
  role: string;
}[] = [
  { key: "primary", label: "Primary", group: "Marka", role: "Birincil aksiyonlar, focus ring, vurgu" },
  { key: "secondary", label: "Secondary", group: "Marka", role: "İkincil butonlar, alternatif vurgu" },
  { key: "accent", label: "Accent", group: "Marka", role: "Highlight, rozet, dekoratif vurgu" },
  { key: "neutral", label: "Neutral", group: "Nötr", role: "Border, ayraç, ikincil metin tonu" },
  { key: "success", label: "Success", group: "Durum", role: "Başarı, onay, sağlıklı durum" },
  { key: "warning", label: "Warning", group: "Durum", role: "Uyarı, dikkat, bekleyen durum" },
  { key: "destructive", label: "Destructive", group: "Durum", role: "Hata, yıkıcı işlem, silme" },
];

/* ── Preset temalar (page-local seed) ─────────────────────────────── */
const PRESETS: { id: string; name: string; desc: string; brand: BrandColors }[] = [
  {
    id: "indigo",
    name: "Indigo (Varsayılan)",
    desc: "Dengeli, modern SaaS paleti",
    brand: DEFAULT_BRAND,
  },
  {
    id: "emerald",
    name: "Emerald",
    desc: "Doğal, finans/sağlık temalı",
    brand: { primary: "#059669", secondary: "#0d9488", accent: "#84cc16", neutral: "#64748b", success: "#16a34a", warning: "#d97706", destructive: "#dc2626" },
  },
  {
    id: "rose",
    name: "Rose",
    desc: "Sıcak, tüketici odaklı",
    brand: { primary: "#e11d48", secondary: "#db2777", accent: "#f97316", neutral: "#78716c", success: "#16a34a", warning: "#ea580c", destructive: "#b91c1c" },
  },
  {
    id: "slate",
    name: "Slate Pro",
    desc: "Sade, kurumsal, düşük doygunluk",
    brand: { primary: "#475569", secondary: "#64748b", accent: "#0ea5e9", neutral: "#94a3b8", success: "#15803d", warning: "#b45309", destructive: "#b91c1c" },
  },
  {
    id: "midnight",
    name: "Midnight",
    desc: "Yüksek kontrast, koyu mod öncelikli",
    brand: { primary: "#818cf8", secondary: "#a78bfa", accent: "#22d3ee", neutral: "#94a3b8", success: "#34d399", warning: "#fbbf24", destructive: "#f87171" },
  },
  {
    id: "sunset",
    name: "Sunset",
    desc: "Canlı, yaratıcı/medya temalı",
    brand: { primary: "#f97316", secondary: "#f59e0b", accent: "#ec4899", neutral: "#a8a29e", success: "#22c55e", warning: "#eab308", destructive: "#ef4444" },
  },
];

const FILTERS = ["Tümü", "Marka", "Durum", "Nötr", "Sorunlu"] as const;
type FilterKey = (typeof FILTERS)[number];

function fmtNow() {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function ThemePage() {
  const brand = useThemeStore((s) => s.brand);
  const setColor = useThemeStore((s) => s.setColor);
  const setBrand = useThemeStore((s) => s.setBrand);
  const resetBrand = useThemeStore((s) => s.resetBrand);
  const { isDark } = useTheme();

  // En son "kaydedilen" snapshot — kirli (dirty) durum ve geri-al için.
  const [saved, setSaved] = useState<BrandColors>(brand);
  const [savedAt, setSavedAt] = useState<string>("14:02");
  const [filter, setFilter] = useState<FilterKey>("Tümü");
  const [search, setSearch] = useState("");
  const [activePreset, setActivePreset] = useState<string>("indigo");
  const [detailKey, setDetailKey] = useState<keyof BrandColors | null>(null);

  // Live preview: push the brand primary into the real CSS vars so the whole
  // app recolors. SSR-safe — runs only in the browser effect.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", brand.primary);
    root.style.setProperty("--ring", brand.primary);
    root.style.setProperty("--brand", brand.primary);
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--brand");
    };
  }, [brand.primary]);

  const bg = isDark ? "#111114" : "#ffffff";

  /* ── Türetilmiş metrikler ───────────────────────────────────────── */
  const audit = useMemo(
    () =>
      SWATCHES.map((s) => {
        const ratio = contrastRatio(brand[s.key], bg);
        return { ...s, value: brand[s.key], ratio, level: wcagLevel(ratio) };
      }),
    [brand, bg],
  );

  const passAA = audit.filter((a) => a.ratio >= 4.5).length;
  const passAAA = audit.filter((a) => a.ratio >= 7).length;
  const failing = audit.filter((a) => a.ratio < 4.5);
  const avgRatio = audit.reduce((sum, a) => sum + a.ratio, 0) / audit.length;
  const healthScore = Math.round((passAA / SWATCHES.length) * 100);

  const dirtyKeys = SWATCHES.filter((s) => brand[s.key] !== saved[s.key]).map((s) => s.key);
  const isDirty = dirtyKeys.length > 0;

  // Filtrelenmiş token listesi.
  const rows = useMemo(() => {
    return audit.filter((a) => {
      if (filter === "Sorunlu" && a.ratio >= 4.5) return false;
      if (filter === "Marka" && a.group !== "Marka") return false;
      if (filter === "Durum" && a.group !== "Durum") return false;
      if (filter === "Nötr" && a.group !== "Nötr") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.label.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [audit, filter, search]);

  const detail = detailKey ? audit.find((a) => a.key === detailKey) ?? null : null;

  /* ── Aksiyonlar ─────────────────────────────────────────────────── */
  function applyPreset(p: (typeof PRESETS)[number]) {
    setBrand(p.brand);
    setActivePreset(p.id);
    toast.success("Preset uygulandı", { description: `${p.name} paleti yüklendi (kaydedilmedi)` });
  }

  function save() {
    setSaved(brand);
    setSavedAt(fmtNow());
    toast.success("Tema kaydedildi", {
      description: `${dirtyKeys.length || "Tüm"} token güncel · ${passAA}/${SWATCHES.length} AA geçti`,
    });
  }

  function revert() {
    setBrand(saved);
    toast.message("Kaydedilmemiş değişiklikler geri alındı");
  }

  function fixAll() {
    if (failing.length === 0) {
      toast.info("Tüm tokenlar zaten AA seviyesinde");
      return;
    }
    failing.forEach((a) => setColor(a.key, suggestAccessible(a.value, bg, 4.5)));
    toast.success("AI toplu düzeltme uygulandı", {
      description: `${failing.length} token AA (4.5:1) eşiğine yükseltildi`,
    });
  }

  function fixOne(key: keyof BrandColors, value: string, label: string) {
    const fixed = suggestAccessible(value, bg, 4.5);
    setColor(key, fixed);
    toast.success("AI düzeltmesi uygulandı", { description: `${label} → ${fixed} (AA için)` });
  }

  function exportTokens() {
    const payload = brandToTokensJson(brand);
    navigator.clipboard?.writeText(payload);
    toast.success("Tüm token'lar JSON olarak panoya kopyalandı", {
      description: `${SWATCHES.length} renk · design token formatı`,
    });
  }

  // DetailDrawer sekmeleri.
  const drawerTabs: DrawerTab[] = detail
    ? buildDrawerTabs(detail, bg, savedAt, saved[detail.key] !== detail.value)
    : [];

  return (
    <>
      <PageHeader
        title="Theme"
        description="Marka token paneli, WCAG kontrast denetimi, preset temalar ve token export."
        actions={[
          { label: "AI: Tümünü düzelt", icon: Sparkles, onClick: fixAll },
          { label: "Sıfırla", icon: RotateCcw, onClick: () => { resetBrand(); setActivePreset("indigo"); toast.success("Varsayılana döndürüldü"); } },
          ...(isDirty ? [{ label: "Geri al", icon: ArrowsClockwise, onClick: revert } as const] : []),
          { label: isDirty ? `Kaydet (${dirtyKeys.length})` : "Kaydedildi", icon: Save, variant: "default" as const, onClick: save },
        ]}
      />

      <PageBody className="space-y-5">
        {/* KPI şeridi */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Token sağlığı"
            value={`${healthScore}%`}
            delta={healthScore - 71}
            trend={[58, 63, 71, 71, 84, healthScore]}
            icon={ShieldCheck}
            hint="AA geçen oranı"
          />
          <KpiCard
            label="AA geçen token"
            value={`${passAA}/${SWATCHES.length}`}
            delta={passAA - 5}
            deltaSuffix=""
            trend={[4, 4, 5, 5, 6, passAA]}
            icon={CheckCircle}
            hint="4.5:1 eşiği"
          />
          <KpiCard
            label="Ort. kontrast"
            value={`${avgRatio.toFixed(2)}:1`}
            delta={Number((avgRatio - 5.1).toFixed(1))}
            deltaSuffix=""
            trend={[4.1, 4.6, 5.1, 5.3, 5.8, avgRatio]}
            icon={Drop}
            hint={`AAA: ${passAAA}`}
          />
          <KpiCard
            label="Sorunlu token"
            value={failing.length}
            delta={failing.length - 2}
            deltaSuffix=""
            invert
            trend={[3, 3, 2, 2, 1, failing.length]}
            icon={AlertTriangle}
            hint="Fail (<4.5:1)"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          {/* Sol kolon: token editörü */}
          <div className="space-y-5">
            <Card>
              <CardHeader className="gap-3 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Palette className="size-4 text-primary" /> Renk Token Paneli
                  </CardTitle>
                  {isDirty && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                      <PencilSimple className="size-3" /> {dirtyKeys.length} kaydedilmemiş
                    </Badge>
                  )}
                </div>
                <FilterBar
                  search={search}
                  onSearch={setSearch}
                  placeholder="Token / rol ara…"
                  onExport={exportTokens}
                >
                  {FILTERS.map((f) => {
                    const count =
                      f === "Tümü"
                        ? SWATCHES.length
                        : f === "Sorunlu"
                          ? failing.length
                          : audit.filter((a) => a.group === f).length;
                    return (
                      <FilterChip key={f} active={filter === f} count={count} onClick={() => setFilter(f)}>
                        {f}
                      </FilterChip>
                    );
                  })}
                </FilterBar>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows.length === 0 ? (
                  <EmptyState
                    icon={Swatches}
                    variant="search"
                    title="Eşleşen token yok"
                    description="Arama veya filtre kriterlerini gevşetmeyi deneyin."
                    action={
                      <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilter("Tümü"); }}>
                        Filtreleri temizle
                      </Button>
                    }
                  />
                ) : (
                  rows.map((a) => {
                    const fails = a.ratio < 4.5;
                    const isDirtyRow = saved[a.key] !== a.value;
                    return (
                      <div
                        key={a.key}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailKey(a.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDetailKey(a.key);
                          }
                        }}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent px-1.5 py-1.5 text-left transition-colors hover:border-border hover:bg-accent/30"
                      >
                        <label
                          className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="color"
                            value={a.value}
                            onChange={(e) => setColor(a.key, e.target.value)}
                            className="absolute inset-0 size-full cursor-pointer opacity-0"
                            aria-label={`${a.label} rengini değiştir`}
                          />
                          <span className="block size-full" style={{ background: a.value }} />
                        </label>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{a.label}</span>
                            <span className="font-mono text-xs text-muted-foreground">{a.value}</span>
                            {isDirtyRow && <span className="size-1.5 rounded-full bg-amber-400" title="Kaydedilmemiş" />}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">{a.role}</p>
                        </div>
                        <ContrastBadge fg={a.value} bg={bg} label="vs bg" />
                        {fails && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-amber-400"
                            title="AI: erişilebilir renge yükselt"
                            onClick={(e) => {
                              e.stopPropagation();
                              fixOne(a.key, a.value, a.label);
                            }}
                          >
                            <Wand2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Preset temalar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Swatches className="size-4 text-primary" /> Preset Temalar
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2.5">
                {PRESETS.map((p) => {
                  const active = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className={
                        "group rounded-xl border p-3 text-left transition-colors " +
                        (active ? "border-primary/50 bg-primary/5" : "hover:border-primary/30 hover:bg-accent/20")
                      }
                    >
                      <div className="mb-2 flex gap-1">
                        {(["primary", "secondary", "accent", "success", "warning", "destructive"] as const).map((k) => (
                          <span key={k} className="size-4 flex-1 rounded" style={{ background: p.brand[k] }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{p.name}</span>
                        {active && <CheckCircle className="size-3.5 text-primary" weight="regular" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{p.desc}</p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <TokenExport brand={brand} />
          </div>

          {/* Sağ kolon: önizleme + kontrast denetimi */}
          <div className="space-y-5">
            {/* Canlı önizleme */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Eye className="size-4 text-primary" /> Canlı Önizleme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: brand.primary, color: bestTextOn(brand.primary) }}>
                    Primary
                  </button>
                  <button className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: brand.secondary, color: bestTextOn(brand.secondary) }}>
                    Secondary
                  </button>
                  <button className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: brand.accent, color: bestTextOn(brand.accent) }}>
                    Accent
                  </button>
                  <button
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium"
                    style={{ borderColor: `${brand.neutral}66`, color: brand.neutral }}
                  >
                    Outline
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["success", "warning", "destructive"] as const).map((k) => (
                    <span
                      key={k}
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: `${brand[k]}22`, color: brand[k] }}
                    >
                      {k}
                    </span>
                  ))}
                </div>

                <div className="rounded-lg border p-3" style={{ borderColor: `${brand.primary}40` }}>
                  <p className="text-sm font-medium" style={{ color: brand.primary }}>
                    Vurgu metni — bu renk seçili primary üzerinden üretilir.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buton ve focus ring'leri panel genelinde anında güncellenir.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: "68%", background: brand.primary }} />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">68%</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <Lightning className="size-4 shrink-0 text-amber-400" />
                  <span>
                    WCAG rozetleri seçili renk ile arka plan ({bg}) arasındaki kontrastı gösterir.
                    AA = 4.5:1, AA Large = 3:1, AAA = 7:1. Fail olan renkler için{" "}
                    <Sparkles className="inline size-3 text-primary" /> AI düzeltme önerir.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Kontrast denetim matrisi */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="size-4 text-primary" /> Kontrast Denetimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {audit.map((a) => {
                  const pct = Math.min(100, (a.ratio / 7) * 100);
                  const tone =
                    a.ratio >= 7 ? "#34d399" : a.ratio >= 4.5 ? "#34d399" : a.ratio >= 3 ? "#fbbf24" : "#f87171";
                  return (
                    <div key={a.key} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs">{a.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums">
                        {a.ratio.toFixed(1)}
                      </span>
                      {a.ratio >= 4.5 ? (
                        <CheckCircle className="size-4 shrink-0 text-emerald-400" weight="regular" />
                      ) : (
                        <XCircle className="size-4 shrink-0 text-red-400" weight="regular" />
                      )}
                    </div>
                  );
                })}
                {failing.length > 0 && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5" /> {failing.length} token AA eşiğinin altında
                    </span>
                    <button onClick={fixAll} className="flex items-center gap-1 font-medium hover:underline">
                      <Sparkles className="size-3.5" /> AI ile düzelt
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>

      {/* Token detay draweri */}
      <DetailDrawer
        open={detailKey !== null}
        onOpenChange={(v) => !v && setDetailKey(null)}
        title={detail ? `${detail.label} token` : ""}
        subtitle={detail ? detail.role : undefined}
        badge={
          detail ? (
            <Badge variant={detail.ratio >= 4.5 ? "outline" : "destructive"}>{detail.level}</Badge>
          ) : undefined
        }
        tabs={drawerTabs}
        footer={
          detail ? (
            <div className="flex w-full items-center gap-2 p-3">
              {detail.ratio < 4.5 && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fixOne(detail.key, detail.value, detail.label)}
                >
                  <Sparkles className="size-4" /> AI ile düzelt
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="ml-auto gap-1.5"
                onClick={() => {
                  navigator.clipboard?.writeText(detail!.value);
                  toast.success(`${detail!.label} hex kopyalandı`);
                }}
              >
                Hex kopyala
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}

/* ── DetailDrawer sekme içerikleri ────────────────────────────────── */
function buildDrawerTabs(
  detail: {
    key: keyof BrandColors;
    label: string;
    role: string;
    group: TokenGroup;
    value: string;
    ratio: number;
    level: string;
  },
  bg: string,
  savedAt: string,
  isDirty: boolean,
): DrawerTab[] {
  const onWhite = contrastRatio(detail.value, "#ffffff");
  const onBlack = contrastRatio(detail.value, "#000000");
  const textColor = bestTextOn(detail.value);

  const events: AuditEvent[] = [
    {
      id: "e1",
      action: isDirty ? "token değeri düzenlendi (kaydedilmedi)" : "son kayıtta doğrulandı",
      actor: "turksab.yonetim",
      at: isDirty ? "şimdi" : `bugün ${savedAt}`,
      icon: PencilSimple,
      tone: isDirty ? "amber" : "emerald",
      detail: `${detail.label} = ${detail.value}`,
    },
    {
      id: "e2",
      action: "WCAG kontrast denetimi çalıştırıldı",
      actor: "system",
      at: `bugün ${savedAt}`,
      icon: ShieldCheck,
      tone: detail.ratio >= 4.5 ? "emerald" : "red",
      detail: `vs ${bg} → ${detail.ratio.toFixed(2)}:1 (${detail.level})`,
    },
    {
      id: "e3",
      action: detail.ratio < 4.5 ? "AI erişilebilirlik önerisi üretildi" : "preset paletten yüklendi",
      actor: detail.ratio < 4.5 ? "AI Copilot" : "turksab.yonetim",
      at: "bugün 13:48",
      icon: detail.ratio < 4.5 ? Sparkles : Swatches,
      tone: "primary",
      detail:
        detail.ratio < 4.5
          ? `önerilen → ${suggestAccessible(detail.value, bg, 4.5)}`
          : `grup: ${detail.group}`,
    },
    {
      id: "e4",
      action: "token oluşturuldu",
      actor: "system",
      at: "12 Haz 2026",
      icon: ClockCounterClockwise,
      tone: "default",
    },
  ];

  const tokenJson = JSON.stringify(
    {
      key: detail.key,
      group: detail.group,
      value: detail.value,
      role: detail.role,
      contrast: {
        background: bg,
        ratio: Number(detail.ratio.toFixed(2)),
        level: detail.level,
        passesAA: detail.ratio >= 4.5,
        passesAAA: detail.ratio >= 7,
      },
      onWhite: Number(onWhite.toFixed(2)),
      onBlack: Number(onBlack.toFixed(2)),
      cssVar: `--brand-${detail.key}`,
    },
    null,
    2,
  );

  return [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="space-y-1">
          <div className="mb-3 flex items-center gap-3 rounded-xl border p-3">
            <span className="size-12 shrink-0 rounded-lg border" style={{ background: detail.value }} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{detail.label}</p>
              <p className="font-mono text-xs text-muted-foreground">{detail.value}</p>
            </div>
            <span className="ml-auto"><ContrastBadge fg={detail.value} bg={bg} label="vs bg" /></span>
          </div>
          <Field label="CSS değişkeni" mono>--brand-{detail.key}</Field>
          <Field label="Grup">{detail.group}</Field>
          <Field label="Rol">{detail.role}</Field>
          <Field label="Hex" mono>{detail.value}</Field>
          <Field label="Kontrast (arka plan)" mono>{detail.ratio.toFixed(2)}:1 · {detail.level}</Field>
          <Field label="Beyaz üzerinde" mono>{onWhite.toFixed(2)}:1</Field>
          <Field label="Siyah üzerinde" mono>{onBlack.toFixed(2)}:1</Field>
          <Field label="Önerilen metin" mono>{textColor}</Field>
          {detail.ratio < 4.5 && (
            <Field label="AI önerisi" mono>{suggestAccessible(detail.value, bg, 4.5)}</Field>
          )}
        </div>
      ),
    },
    {
      value: "activity",
      label: "Aktivite",
      content: <AuditTimeline events={events} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="mp-scroll max-h-[60vh] overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
          <code>{tokenJson}</code>
        </pre>
      ),
    },
  ];
}
