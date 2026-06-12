import { useEffect } from "react";
import { RotateCcw, Sparkles, AlertTriangle, Wand2 } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { ContrastBadge } from "~/components/theme/ContrastBadge";
import { TokenExport } from "~/components/theme/TokenExport";
import { useThemeStore, type BrandColors } from "~/stores/theme-store";
import { useTheme } from "~/components/shell/ThemeProvider";
import { contrastRatio, suggestAccessible } from "~/lib/contrast";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Theme — MetaPanel" }];
}

const SWATCHES: { key: keyof BrandColors; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "neutral", label: "Neutral" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "destructive", label: "Destructive" },
];

export default function ThemePage() {
  const brand = useThemeStore((s) => s.brand);
  const setColor = useThemeStore((s) => s.setColor);
  const resetBrand = useThemeStore((s) => s.resetBrand);
  const { isDark } = useTheme();

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

  return (
    <>
      <PageHeader
        title="Theme"
        description="Marka renkleri, WCAG kontrast kontrolü ve token export."
        actions={[
          { label: "Sıfırla", icon: RotateCcw, onClick: () => { resetBrand(); toast.success("Varsayılana döndürüldü"); } },
        ]}
      />
      <PageBody className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Editor */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Marka Renkleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {SWATCHES.map(({ key, label }) => {
                const value = brand[key];
                const ratio = contrastRatio(value, bg);
                const fails = ratio < 4.5;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => setColor(key, e.target.value)}
                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                      <span className="block size-full" style={{ background: value }} />
                    </label>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{value}</span>
                      </div>
                    </div>
                    <ContrastBadge fg={value} bg={bg} label="vs bg" />
                    {fails && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-amber-400"
                        title="AI: erişilebilir renge yükselt"
                        onClick={() => {
                          const fixed = suggestAccessible(value, bg, 4.5);
                          setColor(key, fixed);
                          toast.success("AI düzeltmesi uygulandı", {
                            description: `${label} → ${fixed} (AA için)`,
                          });
                        }}
                      >
                        <Wand2 className="size-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <TokenExport brand={brand} />
        </div>

        {/* Live preview */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Canlı Önizleme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ background: brand.primary }}>
                  Primary
                </button>
                <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ background: brand.secondary }}>
                  Secondary
                </button>
                <button className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: brand.accent, color: "#06121a" }}>
                  Accent
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
                <p className="text-sm" style={{ color: brand.primary }}>
                  Vurgu metni — bu renk seçili primary üzerinden üretilir.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Buton ve focus ring'leri panel genelinde anında güncellenir.
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                <span>
                  WCAG rozetleri seçili renk ile arka plan ({bg}) arasındaki kontrastı gösterir.
                  AA = 4.5:1, AA Large = 3:1, AAA = 7:1. Fail olan renkler için <Sparkles className="inline size-3 text-primary" /> AI düzeltme önerir.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
