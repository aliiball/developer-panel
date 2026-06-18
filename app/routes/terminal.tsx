import { useEffect, useMemo, useRef, useState } from "react";
import {
  TerminalWindow as TerminalIcon,
  Trash as Trash2,
  Copy,
  Plus,
  X,
  Lightning,
  Keyboard,
  BookOpen,
  CaretRight,
  Command as CommandIcon,
  ClockCounterClockwise,
  Cube,
  Database,
  Stack,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  Sparkle,
  Pulse,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  KpiCard,
  EmptyState,
  DetailDrawer,
  Field,
  AuditTimeline,
  type AuditEvent,
} from "~/components/enterprise";

export function meta() {
  return [{ title: "Terminal — MetaPanel" }];
}

/* ── Tipler ─────────────────────────────────────────────────────────── */
interface Line {
  /** girilen komut ("" => sistem/banner çıktısı) */
  cmd: string;
  out: OutLine[];
  /** çıkışın başarı/uyarı/hata tonu — gutter işareti */
  tone?: "ok" | "warn" | "err";
  at: number;
  /** ms cinsinden sahte yürütme süresi */
  ms?: number;
}
type OutLine = string;

interface Session {
  id: string;
  title: string;
  cwd: string;
  lines: Line[];
  history: string[];
}

/* ── Komut kataloğu (otomatik tamamlama + yardım + drawer için) ──────── */
interface CmdSpec {
  name: string;
  desc: string;
  usage?: string;
  category: "Sistem" | "Veri" | "Modül" | "Dağıtım" | "Yardımcı";
  icon: typeof Cube;
}

const COMMANDS: CmdSpec[] = [
  { name: "help", desc: "Tüm komutları ve kullanım ipuçlarını listeler", category: "Yardımcı", icon: BookOpen },
  { name: "models", desc: "Kayıtlı veri modellerini ve endpoint sayılarını gösterir", category: "Veri", icon: Database },
  { name: "schema", desc: "Belirtilen modelin alanlarını döker", usage: "schema <model>", category: "Veri", icon: Database },
  { name: "migrate", desc: "Bekleyen migration'ları uygular", usage: "migrate [--dry-run]", category: "Veri", icon: ArrowsClockwise },
  { name: "migrations", desc: "Migration geçmişini ve durumlarını listeler", category: "Veri", icon: ClockCounterClockwise },
  { name: "modules", desc: "Yüklü modüllerin sağlık durumunu gösterir", category: "Modül", icon: Stack },
  { name: "deploy", desc: "Aktif ortama dağıtım tetikler (mock)", usage: "deploy <env>", category: "Dağıtım", icon: Lightning },
  { name: "status", desc: "Platform servislerinin canlılık durumu", category: "Sistem", icon: Pulse },
  { name: "logs", desc: "Son uygulama log satırlarını akıtır", usage: "logs [--level error]", category: "Sistem", icon: BookOpen },
  { name: "cache", desc: "Önbelleği temizler veya istatistik verir", usage: "cache <clear|stats>", category: "Sistem", icon: ArrowsClockwise },
  { name: "env", desc: "Ortam değişkenlerini (maskeli) listeler", category: "Sistem", icon: Cube },
  { name: "whoami", desc: "Aktif oturum kullanıcısını ve rolünü gösterir", category: "Yardımcı", icon: CommandIcon },
  { name: "echo", desc: "Verilen metni geri yazar", usage: "echo <metin>", category: "Yardımcı", icon: CaretRight },
  { name: "history", desc: "Bu oturumun komut geçmişini gösterir", category: "Yardımcı", icon: ClockCounterClockwise },
  { name: "ai", desc: "AI Copilot'a doğal dilde soru sorar (mock)", usage: "ai <soru>", category: "Yardımcı", icon: Sparkle },
  { name: "clear", desc: "Ekranı temizler", category: "Yardımcı", icon: Trash2 },
];

const CMD_NAMES = COMMANDS.map((c) => c.name);

/* ── Mock yürütücü ──────────────────────────────────────────────────── */
function execute(raw: string): { out: OutLine[]; tone?: Line["tone"]; ms: number } {
  const cmd = raw.trim();
  const ms = 30 + Math.floor(Math.random() * 260);
  if (!cmd) return { out: [], ms: 0 };
  const [head, ...rest] = cmd.split(/\s+/);
  const c = head.toLowerCase();
  const arg = rest.join(" ");

  switch (c) {
    case "help":
      return {
        ms,
        out: [
          "MetaPanel Shell — komut referansı (Tab ile otomatik tamamlama):",
          ...COMMANDS.filter((x) => x.name !== "clear").map(
            (x) => `  ${x.name.padEnd(12)} ${x.desc}`,
          ),
          "",
          "İpucu: ↑/↓ geçmiş · Tab tamamla · ⌘K komut paleti · 'clear' temizle",
        ],
      };
    case "models":
      return {
        ms,
        out: [
          "AD          ALANLAR  ENDPOINT  KAYIT",
          "Customer       8        6      12.480",
          "Product       14        7      3.902",
          "Order         11        8      48.117",
          "Category       5        4      62",
          "BlogPost       9        5      214",
          "Invoice       12        6      9.330",
          "",
          "6 model · 36 endpoint · son senkron 4 dk önce",
        ],
      };
    case "schema": {
      if (!arg) return { tone: "warn", ms, out: ["kullanım: schema <model>  — ör. 'schema Order'"] };
      const known: Record<string, string[]> = {
        order: [
          "Order {",
          "  id          uuid        @id @default(uuid())",
          "  customerId  uuid        @relation(Customer)",
          "  total       decimal(12,2)",
          "  status      enum        pending|paid|shipped|cancelled",
          "  createdAt   timestamptz @default(now())",
          "}",
        ],
        customer: [
          "Customer {",
          "  id      uuid    @id",
          "  email   citext  @unique",
          "  name    text",
          "  tier    enum    free|pro|enterprise",
          "}",
        ],
      };
      const def = known[arg.toLowerCase()];
      return def
        ? { ms, out: def }
        : { tone: "err", ms, out: [`model bulunamadı: ${arg} — 'models' ile listeyi görün`] };
    }
    case "migrate": {
      if (arg.includes("--dry-run"))
        return {
          tone: "warn",
          ms,
          out: ["KURU ÇALIŞTIRMA — değişiklik uygulanmadı", "→ 007_add_audit_log (bekliyor)", "→ 008_index_orders_status (bekliyor)", "2 migration uygulanacaktı."],
        };
      return {
        tone: "ok",
        ms: ms + 90,
        out: ["→ 007_add_audit_log uygulanıyor…", "→ 008_index_orders_status uygulanıyor…", "✓ 2 migration tamamlandı (218ms)"],
      };
    }
    case "migrations":
      return {
        ms,
        out: [
          "VERSİYON                 DURUM      SÜRE",
          "001_init                 ✓ applied   1.2s",
          "002_add_customers        ✓ applied   340ms",
          "003_orders_fk            ✓ applied   210ms",
          "006_feature_flags        ✓ applied   95ms",
          "007_add_audit_log        ⧗ pending     —",
          "008_index_orders_status  ⧗ pending     —",
        ],
      };
    case "modules":
      return {
        ms,
        out: [
          "E-Commerce   ✓ healthy   v3.4.1",
          "Blog         ✓ healthy   v1.9.0",
          "CRM          ✓ healthy   v2.2.7",
          "Inventory    ✗ disabled  v0.8.0 (pasif)",
          "Payments     ⚠ degraded  v4.1.2 (webhook gecikmesi)",
        ],
        tone: "warn",
      };
    case "deploy": {
      const env = arg || "production";
      return {
        tone: "ok",
        ms: ms + 140,
        out: [
          `→ ${env} ortamına dağıtım kuyruğa alındı`,
          "  build #1842 · commit abfdded · 6 servis",
          "✓ rollout tamamlandı (yeşil/yeşil) — 41s",
        ],
      };
    }
    case "status":
      return {
        ms,
        out: [
          "API Gateway      ● up    p95 86ms",
          "Postgres         ● up    23% conn",
          "Redis            ● up    0.4ms",
          "Job Queue        ● up    2 bekleyen",
          "Webhook Worker   ◐ degraded  retry 3",
        ],
        tone: "warn",
      };
    case "logs":
      return {
        ms,
        out: [
          "14:09:51 INFO  http   GET /api/orders 200 41ms",
          "14:09:52 INFO  auth   login turksab.yonetim@gmail.com",
          "14:09:55 WARN  pay    webhook retry 2/5 (stripe)",
          "14:10:01 ERROR pay    webhook timeout after 30s",
          "14:10:02 INFO  http   POST /api/migrate 200 218ms",
        ],
        tone: arg.includes("error") ? "err" : undefined,
      };
    case "cache": {
      if (arg === "clear") return { tone: "ok", ms, out: ["✓ önbellek temizlendi — 14.204 anahtar düşürüldü"] };
      if (arg === "stats") return { ms, out: ["isabet oranı   94.2%", "anahtar         14.204", "bellek          312 MB / 512 MB"] };
      return { tone: "warn", ms, out: ["kullanım: cache <clear|stats>"] };
    }
    case "env":
      return {
        ms,
        out: [
          "NODE_ENV        production",
          "DATABASE_URL    postgres://••••••@db:5432/meta",
          "REDIS_URL       redis://••••••@cache:6379",
          "STRIPE_KEY      sk_live_••••••••••••4f2a",
          "FEATURE_FLAGS   ai_triage,release_notes",
        ],
      };
    case "whoami":
      return { ms, out: ["turksab.yonetim@gmail.com", "rol: admin · workspace: turksab · 2FA: aktif"] };
    case "history":
      return { ms, out: ["(geçmiş ↑/↓ ile gezilebilir — bu oturumun komutları)"] };
    case "echo":
      return { ms, out: [arg] };
    case "ai":
      if (!arg) return { tone: "warn", ms, out: ["kullanım: ai <soru>  — ör. 'ai en yavaş endpoint hangisi'"] };
      return {
        ms: ms + 180,
        tone: "ok",
        out: [
          "✦ Copilot analiz ediyor…",
          `  Soru: "${arg}"`,
          "  → POST /api/orders/bulk son 1 saatte p95 1.9s ile en yavaş.",
          "  → Öneri: status alanına index ekleyin (migration 008 bunu yapar).",
        ],
      };
    default:
      return { tone: "err", ms, out: [`komut bulunamadı: ${head} — 'help' yazın`] };
  }
}

/* ── Yardımcılar ────────────────────────────────────────────────────── */
let seq = 0;
const uid = () => `s${Date.now()}-${seq++}`;

function banner(title: string): Line {
  return {
    cmd: "",
    at: Date.now(),
    out: [
      `MetaPanel Shell v1.0 (mock) · ${title}`,
      "'help' ile komutları görün · Tab ile tamamlayın · ⌘K komut paleti",
    ],
  };
}

function newSession(title: string): Session {
  return { id: uid(), title, cwd: "~/turksab", lines: [banner(title)], history: [] };
}

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/* ── Sayfa ──────────────────────────────────────────────────────────── */
export default function Terminal() {
  const [sessions, setSessions] = useState<Session[]>(() => [
    { ...newSession("oturum-1"), lines: [banner("oturum-1")] },
  ]);
  const [activeId, setActiveId] = useState(() => sessions[0].id);
  const [input, setInput] = useState("");
  const [hIdx, setHIdx] = useState(-1);
  const [refOpen, setRefOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];

  /* otomatik tamamlama önerileri (komut adıyla başlayanlar) */
  const suggestions = useMemo(() => {
    const tok = input.trim();
    if (!tok || tok.includes(" ")) return [];
    return CMD_NAMES.filter((n) => n.startsWith(tok.toLowerCase()) && n !== tok.toLowerCase()).slice(0, 6);
  }, [input]);

  /* KPI metrikleri (tüm oturumlar üzerinden türetilmiş) */
  const stats = useMemo(() => {
    const allLines = sessions.flatMap((s) => s.lines).filter((l) => l.cmd !== "");
    const runs = allLines.length;
    const errs = allLines.filter((l) => l.tone === "err").length;
    const durations = allLines.filter((l) => l.ms).map((l) => l.ms!);
    const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const trend = sessions.map((s) => s.lines.filter((l) => l.cmd !== "").length);
    return {
      runs,
      errs,
      avg,
      sessions: sessions.length,
      okRate: runs ? Math.round(((runs - errs) / runs) * 100) : 100,
      trend: trend.length > 1 ? trend : [...trend, runs],
    };
  }, [sessions]);

  /* aktivite zaman çizelgesi (drawer için) */
  const audit: AuditEvent[] = useMemo(() => {
    const evs = active.lines
      .filter((l) => l.cmd !== "")
      .slice(-12)
      .reverse()
      .map<AuditEvent>((l, i) => ({
        id: `${active.id}-${l.at}-${i}`,
        actor: "turksab.yonetim",
        action: `\`${l.cmd}\` çalıştırıldı`,
        at: `${fmtTime(l.at)} · ${l.ms ?? 0}ms`,
        tone: l.tone === "err" ? "red" : l.tone === "warn" ? "amber" : "emerald",
        icon: l.tone === "err" ? WarningCircle : CheckCircle,
        detail: l.out[0]?.slice(0, 80),
      }));
    return evs.length
      ? evs
      : [
          {
            id: "init",
            actor: "system",
            action: "oturum başlatıldı",
            at: fmtTime(active.lines[0]?.at ?? Date.now()),
            tone: "primary",
            icon: TerminalIcon,
          },
        ];
  }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active.lines, activeId]);

  /* ⌘K → komut referansı drawer */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRefOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function patchActive(fn: (s: Session) => Session) {
    setSessions((prev) => prev.map((s) => (s.id === activeId ? fn(s) : s)));
  }

  function submit() {
    const cmd = input;
    const trimmed = cmd.trim();
    if (trimmed.toLowerCase() === "clear") {
      patchActive((s) => ({ ...s, lines: [] }));
      setInput("");
      setHIdx(-1);
      return;
    }
    const res = execute(cmd);
    patchActive((s) => ({
      ...s,
      lines: [...s.lines, { cmd, out: res.out, tone: res.tone, at: Date.now(), ms: res.ms }],
      history: trimmed ? [cmd, ...s.history] : s.history,
    }));
    setInput("");
    setHIdx(-1);
  }

  function complete() {
    if (suggestions.length > 0) setInput(suggestions[0] + " ");
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const ni = Math.min(hIdx + 1, active.history.length - 1);
      if (active.history[ni] !== undefined) {
        setHIdx(ni);
        setInput(active.history[ni]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const ni = Math.max(hIdx - 1, -1);
      setHIdx(ni);
      setInput(ni === -1 ? "" : active.history[ni]);
    }
  }

  function addSession() {
    const next = newSession(`oturum-${sessions.length + 1}`);
    setSessions((p) => [...p, next]);
    setActiveId(next.id);
    setInput("");
    setHIdx(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeSession(id: string) {
    setSessions((prev) => {
      if (prev.length === 1) {
        toast.message("Son oturum kapatılamaz", { description: "En az bir terminal oturumu açık kalmalı." });
        return prev;
      }
      const next = prev.filter((s) => s.id !== id);
      if (id === activeId) setActiveId(next[next.length - 1].id);
      return next;
    });
  }

  function clearActive() {
    patchActive((s) => ({ ...s, lines: [] }));
    toast.success("Ekran temizlendi");
  }

  async function copyOutput() {
    const text = active.lines
      .flatMap((l) => (l.cmd ? [`❯ ${l.cmd}`, ...l.out] : l.out))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Çıktı kopyalandı", { description: `${active.title} · ${text.split("\n").length} satır` });
    } catch {
      toast.error("Kopyalanamadı", { description: "Pano erişimi reddedildi." });
    }
  }

  function runQuick(cmd: string) {
    setInput(cmd);
    setHIdx(-1);
    const res = execute(cmd);
    patchActive((s) => ({
      ...s,
      lines: [...s.lines, { cmd, out: res.out, tone: res.tone, at: Date.now(), ms: res.ms }],
      history: [cmd, ...s.history],
    }));
    setInput("");
    inputRef.current?.focus();
  }

  const refTabs = [
    {
      value: "ref",
      label: "Komutlar",
      content: (
        <div className="space-y-4">
          {(["Sistem", "Veri", "Modül", "Dağıtım", "Yardımcı"] as const).map((cat) => {
            const items = COMMANDS.filter((c) => c.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat}
                </p>
                <div className="space-y-1">
                  {items.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setRefOpen(false);
                        runQuick(c.usage ? c.name : c.name);
                      }}
                      className="flex w-full items-start gap-2.5 rounded-lg border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
                    >
                      <c.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="font-mono text-xs font-medium text-foreground">
                          {c.usage ?? c.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{c.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      value: "keys",
      label: "Kısayollar",
      content: (
        <div className="space-y-1">
          {[
            ["Enter", "Komutu çalıştır"],
            ["Tab", "İlk öneriyle tamamla"],
            ["↑ / ↓", "Komut geçmişinde gez"],
            ["⌘K / Ctrl+K", "Komut referansını aç/kapat"],
            ["clear", "Ekranı temizle"],
          ].map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-1.5">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd>
              <span className="text-xs text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      value: "session",
      label: "Oturum",
      content: (
        <div className="space-y-0.5">
          <Field label="Oturum">{active.title}</Field>
          <Field label="Çalışma dizini" mono>{active.cwd}</Field>
          <Field label="Komut sayısı">{active.history.length}</Field>
          <Field label="Çıktı satırı">{active.lines.reduce((a, l) => a + l.out.length, 0)}</Field>
          <Field label="Kullanıcı" mono>turksab.yonetim@gmail.com</Field>
          <Field label="Açık oturum">{sessions.length}</Field>
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Aktivite
            </p>
            <AuditTimeline events={audit} />
          </div>
        </div>
      ),
    },
  ];

  const QUICK = ["status", "models", "migrate --dry-run", "modules", "ai en yavaş endpoint"];

  return (
    <>
      <PageHeader
        title="Terminal"
        description="Gömülü komut terminali (mock). Çok oturumlu · geçmiş · otomatik tamamlama."
        actions={[
          { label: "Yeni oturum", icon: Plus, onClick: addSession },
          { label: "Komutlar", icon: BookOpen, onClick: () => setRefOpen(true) },
          { label: "Kopyala", icon: Copy, onClick: copyOutput },
          { label: "Temizle", icon: Trash2, onClick: clearActive },
        ]}
      />
      <PageBody grid={false} className="flex flex-col gap-4">
        {/* KPI şeridi */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="Çalıştırılan komut"
            value={stats.runs}
            delta={stats.runs > 0 ? 12 : undefined}
            trend={stats.trend}
            icon={CommandIcon}
            hint="tüm oturumlar"
          />
          <KpiCard
            label="Başarı oranı"
            value={`${stats.okRate}%`}
            delta={stats.errs > 0 ? -stats.errs : 0}
            icon={CheckCircle}
            hint="hatasız çalışma"
          />
          <KpiCard
            label="Ort. yürütme"
            value={`${stats.avg}ms`}
            trend={[120, 180, 90, 220, stats.avg || 100]}
            icon={Pulse}
            invert
            hint="komut başına"
          />
          <KpiCard
            label="Açık oturum"
            value={stats.sessions}
            icon={TerminalIcon}
            hint={`${stats.errs} hata`}
          />
        </div>

        {/* Hızlı komutlar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lightning className="size-3.5" /> Hızlı:
          </span>
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => runQuick(q)}
              className="rounded-full border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Terminal yüzeyi */}
        <div className="flex min-h-[26rem] flex-1 flex-col overflow-hidden rounded-xl border bg-[#0b0b0e]">
          {/* Sekme şeridi */}
          <div className="flex items-center gap-1 border-b border-white/5 bg-black/20 px-2 py-1.5">
            <TerminalIcon className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
            <div className="mp-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={
                    "group/tab flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs transition-colors " +
                    (s.id === activeId
                      ? "bg-white/10 text-foreground"
                      : "text-muted-foreground hover:bg-white/5")
                  }
                >
                  <button onClick={() => { setActiveId(s.id); setHIdx(-1); }} className="outline-none">
                    {s.title}
                  </button>
                  <button
                    onClick={() => closeSession(s.id)}
                    aria-label={`${s.title} oturumunu kapat`}
                    className="opacity-0 transition-opacity hover:text-red-400 group-hover/tab:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={addSession}
                aria-label="Yeni oturum"
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <Badge variant="outline" className="border-white/10 font-mono text-[10px] text-muted-foreground">
              {active.cwd}
            </Badge>
            <div className="ml-1 flex gap-1.5 pr-1">
              <span className="size-2.5 rounded-full bg-red-500/70" />
              <span className="size-2.5 rounded-full bg-amber-500/70" />
              <span className="size-2.5 rounded-full bg-emerald-500/70" />
            </div>
          </div>

          {/* Çıktı alanı */}
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="mp-scroll flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed"
          >
            {active.lines.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  icon={TerminalIcon}
                  title="Ekran temiz"
                  description="Yeni bir komut yazın veya aşağıdan hızlı komutlardan birini seçin. 'help' tüm komutları listeler."
                  action={
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => runQuick("help")}>
                      <BookOpen className="size-4" /> help çalıştır
                    </Button>
                  }
                />
              </div>
            ) : (
              active.lines.map((l, i) => (
                <div key={i} className="group/line">
                  {l.cmd !== "" && (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">❯</span>
                      <span className="text-foreground">{l.cmd}</span>
                      {l.ms !== undefined && (
                        <span className="ml-auto text-[10px] text-muted-foreground/50 opacity-0 transition-opacity group-hover/line:opacity-100">
                          {fmtTime(l.at)} · {l.ms}ms
                        </span>
                      )}
                    </div>
                  )}
                  {l.out.map((o, j) => (
                    <div
                      key={j}
                      className={
                        "whitespace-pre " +
                        (l.tone === "err"
                          ? "text-red-400/90"
                          : l.tone === "warn"
                            ? "text-amber-300/90"
                            : l.tone === "ok"
                              ? "text-emerald-300/90"
                              : "text-muted-foreground")
                      }
                    >
                      {o}
                    </div>
                  ))}
                </div>
              ))
            )}

            {/* Prompt satırı */}
            <div className="mt-1 flex items-center gap-2">
              <span className="text-emerald-400">❯</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                autoFocus
                spellCheck={false}
                aria-label="Terminal komut girişi"
                placeholder="komut yazın… (Tab tamamla · ↑ geçmiş)"
                className="flex-1 bg-transparent text-foreground caret-primary outline-none placeholder:text-muted-foreground/40"
              />
            </div>

            {/* Otomatik tamamlama ipuçları */}
            {suggestions.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-5">
                <span className="text-[10px] text-muted-foreground/60">öneri:</span>
                {suggestions.map((s, idx) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s + " "); inputRef.current?.focus(); }}
                    className={
                      "rounded border px-1.5 py-0.5 text-[11px] transition-colors " +
                      (idx === 0
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 text-muted-foreground hover:text-foreground")
                    }
                  >
                    {s}
                    {idx === 0 && <span className="ml-1 text-muted-foreground/50">⇥</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Durum çubuğu */}
          <div className="flex items-center gap-3 border-t border-white/5 bg-black/20 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Keyboard className="size-3" /> {active.title}
            </span>
            <span>{active.history.length} komut</span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" /> bağlı (mock)
            </span>
            <button
              onClick={() => setRefOpen(true)}
              className="ml-auto flex items-center gap-1 hover:text-foreground"
            >
              <CommandIcon className="size-3" /> ⌘K komutlar
            </button>
          </div>
        </div>
      </PageBody>

      <DetailDrawer
        open={refOpen}
        onOpenChange={setRefOpen}
        title="Komut referansı"
        subtitle="Otomatik tamamlama, kısayollar ve oturum bilgisi"
        badge={
          <Badge variant="outline" className="font-mono text-[10px]">
            {COMMANDS.length} komut
          </Badge>
        }
        tabs={refTabs}
        footer={
          <p className="px-1 py-1 text-[11px] text-muted-foreground">
            Bu mock bir kabuktur — komutlar gerçek altyapıyı etkilemez.
          </p>
        }
      />
    </>
  );
}
