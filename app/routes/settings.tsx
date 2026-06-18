import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import type { Icon } from "@phosphor-icons/react";
import {
  Copy,
  Eye,
  EyeSlash as EyeOff,
  Monitor,
  Moon,
  Sun,
  FloppyDisk,
  ArrowCounterClockwise,
  ShieldCheck,
  Sparkle,
  Code,
  Gear,
  PaintBrush,
  Warning,
  Trash,
  ArrowsClockwise,
  CheckCircle,
  PencilSimple,
  Clock,
  Globe,
  ClockCounterClockwise,
  Key,
  Lightning,
  Spinner,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useTheme } from "~/components/shell/ThemeProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  KpiCard,
  DetailDrawer,
  Field,
  AuditTimeline,
  type AuditEvent,
  type DrawerTab,
} from "~/components/enterprise";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Settings — MetaPanel" }];
}

/* ── Ayar şeması (page-local seed) ──────────────────────────────────
 * Her ayar açıklamalı; tip/sekme/varsayılan ile birlikte. Bu sayede
 * "kirli alan" (dirty) takibi, JSON dökümü ve audit gerçekçi olur.
 */
type SettingsState = {
  // Genel
  workspaceName: string;
  defaultLang: string;
  timezone: string;
  weekStart: string;
  numberFormat: string;
  // Görünüm
  density: string;
  accent: string;
  sidebarMode: string;
  reduceMotion: boolean;
  // AI Copilot
  copilotModel: string;
  streaming: boolean;
  proactive: boolean;
  autoTriage: boolean;
  tone: string;
  temperature: string;
  contextWindow: string;
  // Geliştirici
  apiVersion: string;
  rateLimit: string;
  webhookRetries: string;
  sandboxMode: boolean;
  verboseLogs: boolean;
};

const DEFAULTS: SettingsState = {
  workspaceName: "Acme Commerce",
  defaultLang: "tr",
  timezone: "Europe/Istanbul",
  weekStart: "monday",
  numberFormat: "1.234,56",
  density: "comfortable",
  accent: "indigo",
  sidebarMode: "expanded",
  reduceMotion: false,
  copilotModel: "claude-opus-4-8",
  streaming: true,
  proactive: true,
  autoTriage: true,
  tone: "balanced",
  temperature: "0.4",
  contextWindow: "200k",
  apiVersion: "2026-04-01",
  rateLimit: "600",
  webhookRetries: "5",
  sandboxMode: false,
  verboseLogs: false,
};

const LANGS = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
];
const TIMEZONES = [
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "Asia/Dubai",
  "UTC",
];
const MODELS = [
  { value: "claude-opus-4-8", label: "Claude Opus 4.8", hint: "En yetenekli — derin akıl yürütme" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Dengeli — hız/kalite" },
  { value: "claude-haiku-4-2", label: "Claude Haiku 4.2", hint: "En hızlı — düşük gecikme" },
];

/* Audit seed — son güncelleyen / ne zaman izlenebilirliği */
const AUDIT: AuditEvent[] = [
  { id: "a1", actor: "Sen", action: "AI Copilot modelini 'Claude Opus 4.8' yaptı", at: "2 saat önce", icon: Sparkle, tone: "primary", detail: "copilotModel: claude-sonnet-4-6 → claude-opus-4-8" },
  { id: "a2", actor: "Ada Yılmaz", action: "Rate limit'i yükseltti", at: "Dün 16:20", icon: Lightning, tone: "amber", detail: "rateLimit: 300 → 600 req/dk" },
  { id: "a3", actor: "Sen", action: "Görünüm yoğunluğunu 'Kompakt' yaptı", at: "2 gün önce", icon: PaintBrush, tone: "default", detail: "density: comfortable → compact" },
  { id: "a4", actor: "system", action: "API anahtarı otomatik rotate edildi", at: "5 gün önce", icon: ArrowsClockwise, tone: "emerald", detail: "mp_live_sk_***b7e2 oluşturuldu" },
  { id: "a5", actor: "Mert Kaya", action: "Sandbox modunu kapattı", at: "1 hafta önce", icon: Code, tone: "red", detail: "sandboxMode: true → false (production)" },
  { id: "a6", actor: "Sen", action: "Workspace adını değiştirdi", at: "2 hafta önce", icon: PencilSimple, tone: "default", detail: "workspaceName: 'Acme' → 'Acme Commerce'" },
];

const TAB_META: Record<string, { label: string; icon: Icon }> = {
  general: { label: "Genel", icon: Gear },
  appearance: { label: "Görünüm", icon: PaintBrush },
  ai: { label: "AI Copilot", icon: Sparkle },
  developer: { label: "Geliştirici", icon: Code },
};

export default function Settings() {
  const { isDark, setDark } = useTheme();
  const [showKey, setShowKey] = useState(false);
  const [state, setState] = useState<SettingsState>(DEFAULTS);
  const [saved, setSaved] = useState<SettingsState>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wipeText, setWipeText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [apiKey, setApiKey] = useState("mp_live_sk_9f2a7c41b8e3d6a0f1c4b7e2");
  const lastSaved = useRef("Bugün 14:02");

  const set = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  // Kirli alan farkı (dirty diff) — kaydedilmemiş değişiklikler
  const dirtyKeys = useMemo(
    () =>
      (Object.keys(state) as (keyof SettingsState)[]).filter(
        (k) => state[k] !== saved[k],
      ),
    [state, saved],
  );
  const dirty = dirtyKeys.length > 0;

  function save() {
    if (!dirty) return;
    setSaving(true);
    setTimeout(() => {
      setSaved(state);
      setSaving(false);
      lastSaved.current = "az önce";
      toast.success(`${dirtyKeys.length} ayar kaydedildi`, {
        description: dirtyKeys.slice(0, 3).join(", ") + (dirtyKeys.length > 3 ? "…" : ""),
      });
    }, 550);
  }

  function discard() {
    setState(saved);
    toast.info("Değişiklikler geri alındı");
  }

  function resetDefaults() {
    setResetting(true);
    setTimeout(() => {
      setState(DEFAULTS);
      setResetting(false);
      setConfirmReset(false);
      toast.warning("Tüm ayarlar varsayılana döndürüldü", {
        description: "Kaydetmeden çıkarsan eski değerler korunur.",
      });
    }, 600);
  }

  function rotateKey() {
    setRotating(true);
    setTimeout(() => {
      const fresh =
        "mp_live_sk_" +
        Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
      setApiKey(fresh);
      setRotating(false);
      setConfirmRotate(false);
      setShowKey(true);
      toast.success("API anahtarı rotate edildi", {
        description: "Eski anahtar 24 saat sonra geçersiz olacak.",
      });
    }, 600);
  }

  function wipe() {
    setWiping(true);
    setTimeout(() => {
      setWiping(false);
      setConfirmWipe(false);
      setWipeText("");
      toast.error("Workspace silme talebi alındı (mock)", {
        description: "Gerçek bir kurulumda 14 gün geri-alma penceresi başlardı.",
      });
    }, 600);
  }

  // KPI insight'ları (settings için: konfigürasyon sağlığı/durumu)
  const configuredPct = Math.round(((20 - dirtyKeys.length) / 20) * 100);
  const drawerTabs: DrawerTab[] = [
    {
      value: "general",
      label: "Genel",
      content: (
        <div className="space-y-1">
          <Field label="Workspace">{state.workspaceName}</Field>
          <Field label="Dil">{LANGS.find((l) => l.value === state.defaultLang)?.label}</Field>
          <Field label="Saat dilimi" mono>{state.timezone}</Field>
          <Field label="Tema">{isDark ? "Koyu" : "Açık"}</Field>
          <Field label="Copilot modeli">{MODELS.find((m) => m.value === state.copilotModel)?.label}</Field>
          <Field label="API sürümü" mono>{state.apiVersion}</Field>
          <Field label="Kaydedilmemiş değişiklik">
            <Badge variant={dirty ? "destructive" : "outline"}>{dirtyKeys.length}</Badge>
          </Field>
          <Field label="Son güncelleme">{lastSaved.current}</Field>
        </div>
      ),
    },
    { value: "activity", label: "Aktivite", content: <AuditTimeline events={AUDIT} /> },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(state, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Genel, görünüm, AI Copilot ve geliştirici ayarları."
      >
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAuditOpen(true)}>
          <ClockCounterClockwise className="size-4" /> Aktivite
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!dirty}
          onClick={discard}
        >
          <ArrowCounterClockwise className="size-4" /> Geri al
        </Button>
        <Button size="sm" className="gap-1.5" disabled={!dirty || saving} onClick={save}>
          {saving ? <Spinner className="size-4 animate-spin" /> : <FloppyDisk className="size-4" />}
          {saving ? "Kaydediliyor…" : dirty ? `Kaydet (${dirtyKeys.length})` : "Kaydedildi"}
        </Button>
      </PageHeader>

      <PageBody>
        {dirty && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
            <Warning className="size-4 shrink-0 text-amber-400" />
            <span className="text-amber-200">
              <span className="font-medium">{dirtyKeys.length} kaydedilmemiş değişiklik</span> var —{" "}
              <span className="font-mono text-xs text-amber-300/80">
                {dirtyKeys.slice(0, 4).join(", ")}
                {dirtyKeys.length > 4 ? "…" : ""}
              </span>
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={discard}>
                Geri al
              </Button>
              <Button size="sm" className="h-7 gap-1 text-xs" disabled={saving} onClick={save}>
                {saving ? <Spinner className="size-3.5 animate-spin" /> : <FloppyDisk className="size-3.5" />}
                Kaydet
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="general" className="max-w-3xl">
          <TabsList className="h-9">
            {Object.entries(TAB_META).map(([key, { label, icon: TIcon }]) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                <TIcon className="size-3.5" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── GENEL ───────────────────────────────────────────── */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <SettingsCard title="Workspace" icon={Globe} desc="Bu çalışma alanının kimlik ve bölge ayarları.">
              <SettingRow
                label="Workspace adı"
                desc="Fatura, e-posta ve audit kayıtlarında görünür."
              >
                <Input
                  value={state.workspaceName}
                  onChange={(e) => set("workspaceName", e.target.value)}
                  className="h-8 max-w-xs"
                />
              </SettingRow>
              <SettingRow label="Varsayılan dil" desc="Yeni üyeler için arayüz dili.">
                <SelectField value={state.defaultLang} onChange={(v) => set("defaultLang", v)}>
                  {LANGS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectField>
              </SettingRow>
              <SettingRow label="Saat dilimi" desc="Zaman damgaları ve scheduler bu dilime göre.">
                <SelectField value={state.timezone} onChange={(v) => set("timezone", v)} mono>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t} value={t} className="font-mono text-xs">{t}</SelectItem>
                  ))}
                </SelectField>
              </SettingRow>
            </SettingsCard>

            <SettingsCard title="Bölgesel format" icon={Clock} desc="Tarih, sayı ve hafta gösterimi.">
              <SettingRow label="Haftanın başlangıcı" desc="Takvim ve roadmap görünümleri.">
                <SelectField value={state.weekStart} onChange={(v) => set("weekStart", v)}>
                  <SelectItem value="monday">Pazartesi</SelectItem>
                  <SelectItem value="sunday">Pazar</SelectItem>
                </SelectField>
              </SettingRow>
              <SettingRow label="Sayı biçimi" desc="Tablolarda ondalık ve binlik ayırıcı.">
                <SelectField value={state.numberFormat} onChange={(v) => set("numberFormat", v)} mono>
                  <SelectItem value="1.234,56" className="font-mono text-xs">1.234,56 (TR)</SelectItem>
                  <SelectItem value="1,234.56" className="font-mono text-xs">1,234.56 (US)</SelectItem>
                  <SelectItem value="1 234,56" className="font-mono text-xs">1 234,56 (FR)</SelectItem>
                </SelectField>
              </SettingRow>
            </SettingsCard>
          </TabsContent>

          {/* ── GÖRÜNÜM ─────────────────────────────────────────── */}
          <TabsContent value="appearance" className="mt-4 space-y-4">
            <SettingsCard title="Tema" icon={PaintBrush} desc="Arayüzün renk şeması.">
              <div className="grid grid-cols-3 gap-2">
                <SchemeOption icon={Moon} label="Koyu" active={isDark} onClick={() => setDark(true)} />
                <SchemeOption icon={Sun} label="Açık" active={!isDark} onClick={() => setDark(false)} />
                <SchemeOption
                  icon={Monitor}
                  label="Sistem"
                  active={false}
                  onClick={() => toast.info("Sistem teması (mock)")}
                />
              </div>
            </SettingsCard>

            <SettingsCard title="Düzen" icon={Gear} desc="Yoğunluk ve kenar çubuğu davranışı.">
              <SettingRow label="Yoğunluk" desc="Satır yüksekliği ve boşluklar.">
                <SelectField value={state.density} onChange={(v) => set("density", v)}>
                  <SelectItem value="comfortable">Rahat</SelectItem>
                  <SelectItem value="compact">Kompakt</SelectItem>
                </SelectField>
              </SettingRow>
              <SettingRow label="Vurgu rengi" desc="Birincil aksiyonlar ve linkler.">
                <SelectField value={state.accent} onChange={(v) => set("accent", v)}>
                  <SelectItem value="indigo">İndigo</SelectItem>
                  <SelectItem value="emerald">Zümrüt</SelectItem>
                  <SelectItem value="amber">Kehribar</SelectItem>
                  <SelectItem value="rose">Gül</SelectItem>
                </SelectField>
              </SettingRow>
              <SettingRow label="Kenar çubuğu" desc="Açılışta sidebar durumu.">
                <SelectField value={state.sidebarMode} onChange={(v) => set("sidebarMode", v)}>
                  <SelectItem value="expanded">Açık</SelectItem>
                  <SelectItem value="collapsed">Daraltılmış</SelectItem>
                  <SelectItem value="auto">Otomatik</SelectItem>
                </SelectField>
              </SettingRow>
              <ToggleRow
                label="Hareketi azalt"
                desc="Animasyon ve geçişleri en aza indir (a11y)."
                checked={state.reduceMotion}
                onChange={(v) => set("reduceMotion", v)}
              />
            </SettingsCard>
          </TabsContent>

          {/* ── AI COPILOT ──────────────────────────────────────── */}
          <TabsContent value="ai" className="mt-4 space-y-4">
            <SettingsCard title="Model" icon={Sparkle} desc="Copilot'un kullandığı temel model ve bağlam.">
              <SettingRow label="Model" desc="Daha yetenekli model = daha yüksek gecikme.">
                <SelectField value={state.copilotModel} onChange={(v) => set("copilotModel", v)} wide>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectField>
              </SettingRow>
              <p className="rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                {MODELS.find((m) => m.value === state.copilotModel)?.hint}
              </p>
              <SettingRow label="Bağlam penceresi" desc="Tek seferde işlenebilen token miktarı.">
                <SelectField value={state.contextWindow} onChange={(v) => set("contextWindow", v)} mono>
                  <SelectItem value="32k" className="font-mono text-xs">32k</SelectItem>
                  <SelectItem value="200k" className="font-mono text-xs">200k</SelectItem>
                  <SelectItem value="1m" className="font-mono text-xs">1M</SelectItem>
                </SelectField>
              </SettingRow>
              <SettingRow label="Yaratıcılık (temperature)" desc="Düşük = tutarlı, yüksek = çeşitli.">
                <SelectField value={state.temperature} onChange={(v) => set("temperature", v)} mono>
                  <SelectItem value="0.0" className="font-mono text-xs">0.0 — Deterministik</SelectItem>
                  <SelectItem value="0.4" className="font-mono text-xs">0.4 — Dengeli</SelectItem>
                  <SelectItem value="0.8" className="font-mono text-xs">0.8 — Yaratıcı</SelectItem>
                </SelectField>
              </SettingRow>
            </SettingsCard>

            <SettingsCard title="Davranış" icon={Lightning} desc="Copilot'un panel genelindeki tutumu.">
              <ToggleRow
                label="Streaming yanıtlar"
                desc="Yanıtları karakter karakter göster."
                checked={state.streaming}
                onChange={(v) => set("streaming", v)}
              />
              <ToggleRow
                label="Proaktif öneriler"
                desc="Sayfaya özel AI insight toast'ları."
                checked={state.proactive}
                onChange={(v) => set("proactive", v)}
              />
              <ToggleRow
                label="Otomatik triage"
                desc="Yeni issue'lar geldiğinde önem/etiket öner."
                checked={state.autoTriage}
                onChange={(v) => set("autoTriage", v)}
              />
              <SettingRow label="Üslup" desc="Copilot yanıtlarının tonu.">
                <SelectField value={state.tone} onChange={(v) => set("tone", v)}>
                  <SelectItem value="concise">Öz</SelectItem>
                  <SelectItem value="balanced">Dengeli</SelectItem>
                  <SelectItem value="detailed">Detaylı</SelectItem>
                </SelectField>
              </SettingRow>
            </SettingsCard>
          </TabsContent>

          {/* ── GELİŞTİRİCİ ─────────────────────────────────────── */}
          <TabsContent value="developer" className="mt-4 space-y-4">
            <SettingsCard title="API Anahtarı" icon={Key} desc="Tek anahtar gösterimi. Çoklu anahtar yönetimi için ayrı sayfa.">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  className="h-8 font-mono text-xs"
                />
                <Button variant="outline" size="icon" className="size-8" onClick={() => setShowKey((s) => !s)} aria-label={showKey ? "Gizle" : "Göster"}>
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label="Kopyala"
                  onClick={() => {
                    navigator.clipboard?.writeText(apiKey);
                    toast.success("Kopyalandı");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirmRotate(true)}>
                  <ArrowsClockwise className="size-4" /> Rotate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Birden fazla anahtar, scope, rotate ve revoke için{" "}
                <Link to="/api-keys" className="text-primary hover:underline">API Keys</Link> sayfasını kullanın.
              </p>
            </SettingsCard>

            <SettingsCard title="API davranışı" icon={Code} desc="İstek limitleri ve sürüm sabitleme.">
              <SettingRow label="API sürümü" desc="İstekler bu sürüme sabitlenir.">
                <SelectField value={state.apiVersion} onChange={(v) => set("apiVersion", v)} mono>
                  <SelectItem value="2026-04-01" className="font-mono text-xs">2026-04-01 (güncel)</SelectItem>
                  <SelectItem value="2025-11-01" className="font-mono text-xs">2025-11-01</SelectItem>
                  <SelectItem value="2025-06-01" className="font-mono text-xs">2025-06-01 (legacy)</SelectItem>
                </SelectField>
              </SettingRow>
              <SettingRow label="Rate limit" desc="Dakikada izin verilen istek sayısı.">
                <SelectField value={state.rateLimit} onChange={(v) => set("rateLimit", v)} mono>
                  <SelectItem value="300" className="font-mono text-xs">300 / dk</SelectItem>
                  <SelectItem value="600" className="font-mono text-xs">600 / dk</SelectItem>
                  <SelectItem value="1200" className="font-mono text-xs">1200 / dk</SelectItem>
                </SelectField>
              </SettingRow>
              <SettingRow label="Webhook yeniden deneme" desc="Başarısız teslimatta deneme sayısı.">
                <SelectField value={state.webhookRetries} onChange={(v) => set("webhookRetries", v)} mono>
                  <SelectItem value="3" className="font-mono text-xs">3 deneme</SelectItem>
                  <SelectItem value="5" className="font-mono text-xs">5 deneme</SelectItem>
                  <SelectItem value="10" className="font-mono text-xs">10 deneme</SelectItem>
                </SelectField>
              </SettingRow>
              <ToggleRow
                label="Sandbox modu"
                desc="İstekler test ortamına yönlenir; faturalanmaz."
                checked={state.sandboxMode}
                onChange={(v) => set("sandboxMode", v)}
              />
              <ToggleRow
                label="Verbose loglar"
                desc="Hata ayıklama için ayrıntılı istek/yanıt logları."
                checked={state.verboseLogs}
                onChange={(v) => set("verboseLogs", v)}
              />
            </SettingsCard>

            {/* Tehlikeli bölge — onaylı yıkıcı işlemler */}
            <Card className="border-red-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 text-sm text-red-400">
                  <Warning className="size-4" /> Tehlikeli bölge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DangerRow
                  label="Ayarları sıfırla"
                  desc="Tüm sekmelerdeki ayarlar fabrika değerlerine döner."
                  cta="Sıfırla"
                  onClick={() => setConfirmReset(true)}
                />
                <DangerRow
                  label="Workspace'i sil"
                  desc="Tüm projeler, anahtarlar ve veriler kalıcı silinir."
                  cta="Sil"
                  onClick={() => setConfirmWipe(true)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageBody>

      {/* Aktivite / audit drawer */}
      <DetailDrawer
        open={auditOpen}
        onOpenChange={setAuditOpen}
        title="Ayar geçmişi"
        subtitle="Kim, ne zaman, neyi değiştirdi"
        badge={<Badge variant="outline">{AUDIT.length} kayıt</Badge>}
        tabs={drawerTabs}
      />

      {/* Reset onay */}
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        icon={ArrowCounterClockwise}
        title="Ayarları sıfırla?"
        desc="Tüm ayarlar fabrika değerlerine döner. Kaydetmeden çıkarsan mevcut değerlerin korunur."
        cta="Sıfırla"
        onConfirm={resetDefaults}
        busy={resetting}
      />

      {/* Rotate onay */}
      <ConfirmDialog
        open={confirmRotate}
        onOpenChange={setConfirmRotate}
        icon={ArrowsClockwise}
        title="API anahtarını rotate et?"
        desc="Yeni bir anahtar oluşturulur. Eski anahtar 24 saat sonra geçersiz olur — entegrasyonlarını güncelle."
        cta="Rotate et"
        onConfirm={rotateKey}
        busy={rotating}
      />

      {/* Wipe onay (yazarak doğrulama) */}
      <Dialog open={confirmWipe} onOpenChange={(v) => !wiping && setConfirmWipe(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash className="size-4" /> Workspace'i kalıcı sil
            </DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Onaylamak için <span className="font-mono text-foreground">{state.workspaceName}</span> yaz.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={wipeText}
            onChange={(e) => setWipeText(e.target.value)}
            placeholder={state.workspaceName}
            className="h-8 font-mono text-xs"
            disabled={wiping}
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" disabled={wiping} onClick={() => { setConfirmWipe(false); setWipeText(""); }}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={wipeText !== state.workspaceName || wiping}
              onClick={wipe}
            >
              {wiping && <Spinner className="size-3.5 animate-spin" />}
              {wiping ? "Siliniyor…" : "Kalıcı sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Yardımcı bileşenler ────────────────────────────────────────── */

function SettingsCard({
  title,
  desc,
  icon: TIcon,
  children,
}: {
  title: string;
  desc: string;
  icon: Icon;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <TIcon className="size-4 text-muted-foreground" /> {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label className="text-sm">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SelectField({
  value,
  onChange,
  children,
  mono,
  wide,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as string)}>
      <SelectTrigger className={cn("h-8", wide ? "w-56" : "w-44", mono && "font-mono text-xs")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function SchemeOption({
  icon: TIcon,
  label,
  active,
  onClick,
}: {
  icon: Icon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
        active ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-accent",
      )}
    >
      <TIcon className="size-5" />
      <span className="text-xs font-medium">{label}</span>
      {active && <CheckCircle className="size-3.5" weight="fill" />}
    </button>
  );
}

function DangerRow({
  label,
  desc,
  cta,
  onClick,
}: {
  label: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Button variant="destructive" size="sm" className="shrink-0" onClick={onClick}>
        {cta}
      </Button>
    </div>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  icon: TIcon,
  title,
  desc,
  cta,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  icon: Icon;
  title: string;
  desc: string;
  cta: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TIcon className="size-4 text-muted-foreground" /> {title}
          </DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button size="sm" className="gap-1.5" disabled={busy} onClick={onConfirm}>
            {busy && <Spinner className="size-3.5 animate-spin" />}
            {busy ? "İşleniyor…" : cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
