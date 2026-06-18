import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkle as Sparkles,
  PaperPlaneTilt as Send,
  Trash as Trash2,
  Copy,
  Lightning,
  ChatCircleDots,
  ClockCounterClockwise,
  Stack as StackIcon,
  CheckCircle,
  Cpu,
  BookOpen,
  ArrowClockwise,
  User,
  Robot,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { StreamingText } from "~/components/copilot/StreamingText";
import { DiffPreview } from "~/components/copilot/DiffPreview";
import { useCopilotChat } from "~/hooks/use-copilot-chat";
import { useCopilotStore, type AgentRun } from "~/stores/copilot-store";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  EmptyState,
  KpiCard,
  FilterBar,
  FilterChip,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
  type AuditEvent,
} from "~/components/enterprise";
import {
  PROMPT_LIBRARY,
  PROMPT_CATEGORIES,
  CAPABILITIES,
  PREVIEW_KIND_LABEL,
  SURFACE_LABEL,
  type PromptCategory,
} from "~/data/seed.ai-copilot";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "AI Copilot — MetaPanel" }];
}

export default function AICopilot() {
  const { send, alternative, messages } = useCopilotChat();
  const clear = useCopilotStore((s) => s.clear);
  const consumeQueued = useCopilotStore((s) => s.consumeQueued);
  const queued = useCopilotStore((s) => s.queuedPrompt);
  const runs = useCopilotStore((s) => s.runs);

  const [input, setInput] = useState("");
  const [cat, setCat] = useState<PromptCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);
  const lastUserPrompt = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pick up a prompt routed here from Spotlight ("AI: …").
  useEffect(() => {
    if (queued) {
      const q = consumeQueued();
      if (q) {
        lastUserPrompt.current = q;
        send(q);
      }
    }
  }, [queued, consumeQueued, send]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function submit(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text) return;
    lastUserPrompt.current = text;
    send(text);
    setInput("");
  }

  function copyMessage(text: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast.success("Yanıt kopyalandı"),
      () => toast.error("Kopyalanamadı"),
    );
  }

  const empty = messages.length === 0;

  // ── Insight layer: KPI'ler runs üzerinden hesaplanır ──────────────
  const kpi = useMemo(() => {
    const total = runs.length;
    const withPreview = runs.filter((r) => r.outcome === "preview").length;
    const applyRate = total ? Math.round((withPreview / total) * 100) : 0;
    const avgMs = total
      ? Math.round(runs.reduce((a, r) => a + r.durationMs, 0) / total)
      : 0;
    const surfaces = new Set(runs.map((r) => r.surface)).size;
    // küçük sparkline serileri (gerçekçi mock trend)
    return {
      total,
      withPreview,
      applyRate,
      avgMs,
      surfaces,
      trendRuns: [3, 5, 4, 8, 6, 9, total],
      trendPreview: [40, 52, 48, 61, 58, 67, applyRate],
      trendLatency: [1600, 1400, 1500, 1200, 1100, 980, avgMs],
      trendSurfaces: [2, 3, 3, 4, 5, 5, surfaces],
    };
  }, [runs]);

  // ── Prompt kütüphanesi filtreleme ─────────────────────────────────
  const filteredPrompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROMPT_LIBRARY.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (q && !`${p.label} ${p.prompt} ${p.hint}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cat, query]);

  const catCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of PROMPT_LIBRARY) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, []);

  function exportRuns() {
    toast.success("Geçmiş dışa aktarıldı", {
      description: `${runs.length} oturum JSON olarak indirilmek üzere hazırlandı.`,
    });
  }

  return (
    <>
      <PageHeader
        title="AI Copilot"
        description="Doğal dilden şema, modül, form ve endpoint üret. Panelin kalbi."
      >
        <Badge variant="ghost" className="gap-1 text-muted-foreground">
          <Cpu className="size-3" /> metapanel-llm
        </Badge>
        {!empty && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={clear}>
            <Trash2 className="size-4" /> Konuşmayı temizle
          </Button>
        )}
      </PageHeader>

      <PageBody grid={empty} className={cn("flex h-full flex-col", empty && "min-h-full")}>
        {empty ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 py-6">
            {/* Hero + flagship composer — vitrin merkezde */}
            <div className="mx-auto w-full max-w-2xl pt-4 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Sparkles className="size-7" weight="fill" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Ne oluşturmak istersiniz?</h2>
              <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted-foreground">
                Bir şema, modül, form veya endpoint'i doğal dilde tarif edin. Her üretim
                önce önizlenir — siz uygulayana kadar hiçbir şey değişmez.
              </p>

              {/* Büyük composer */}
              <div className="mt-6 rounded-2xl border bg-card p-2 text-left shadow-sm ring-1 ring-foreground/[0.06] transition-shadow focus-within:ring-primary/40">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={3}
                  placeholder="Örn. “Blog için Post, Author ve Comment modellerini ilişkileriyle üret”"
                  aria-label="Copilot'a ne oluşturmak istediğinizi yazın"
                  className="mp-scroll max-h-44 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
                  <span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
                    <Cpu className="size-3" /> metapanel-llm · önizleme önce
                  </span>
                  <Button size="sm" className="gap-1.5" onClick={() => submit()} disabled={!input.trim()}>
                    Üret <Send className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Hızlı başlangıç */}
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {PROMPT_LIBRARY.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => submit(p.prompt)}
                    className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Yetenek kartları */}
            <section className="space-y-3">
              <SectionTitle icon={Sparkles} title="Yetenekler" sub="Copilot'un yapabildikleri" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CAPABILITIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => submit(c.example)}
                    className="group flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <c.icon className="size-4" />
                    </span>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{c.description}</p>
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <Lightning className="size-3" weight="fill" /> Bu örneği dene
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Prompt kütüphanesi */}
            <section className="space-y-3">
              <SectionTitle icon={BookOpen} title="Örnek prompt kütüphanesi" sub={`${PROMPT_LIBRARY.length} hazır istek`} />
              <FilterBar
                search={query}
                onSearch={setQuery}
                placeholder="Kütüphanede ara…"
              >
                <FilterChip active={cat === "all"} onClick={() => setCat("all")} count={PROMPT_LIBRARY.length}>
                  Tümü
                </FilterChip>
                {PROMPT_CATEGORIES.map((c) => (
                  <FilterChip
                    key={c.key}
                    active={cat === c.key}
                    onClick={() => setCat(cat === c.key ? "all" : c.key)}
                    count={catCount[c.key] ?? 0}
                  >
                    {c.label}
                  </FilterChip>
                ))}
              </FilterBar>

              {filteredPrompts.length === 0 ? (
                <EmptyState
                  variant="search"
                  icon={BookOpen}
                  title="Eşleşen örnek yok"
                  description="Arama veya kategori filtresini değiştirin."
                  action={
                    <Button variant="outline" size="sm" onClick={() => { setQuery(""); setCat("all"); }}>
                      Filtreleri sıfırla
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPrompts.map((p) => {
                    const meta = PROMPT_CATEGORIES.find((c) => c.key === p.category);
                    return (
                      <button
                        key={p.id}
                        onClick={() => submit(p.prompt)}
                        className="group flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {meta ? <meta.icon className="size-4" /> : <Sparkles className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.hint}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Geçmiş oturumlar */}
            <section className="space-y-3">
              <SectionTitle
                icon={ClockCounterClockwise}
                title="Geçmiş oturumlar"
                sub={`${runs.length} kayıt`}
                action={
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={exportRuns}>
                    Dışa aktar
                  </Button>
                }
              />
              {runs.length === 0 ? (
                <EmptyState
                  icon={ClockCounterClockwise}
                  title="Henüz oturum yok"
                  description="İlk üretiminiz burada listelenir; tıklayarak detayını ve aktivite akışını görürsünüz."
                />
              ) : (
                <div className="divide-y overflow-hidden rounded-xl border bg-card">
                  {runs.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setActiveRun(r)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        {r.outcome === "preview" ? <Sparkles className="size-4 text-primary" /> : <ChatCircleDots className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{r.prompt}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{SURFACE_LABEL[r.surface] ?? r.surface}</span>
                          <span>·</span>
                          <span className="tabular-nums">{r.durationMs}ms</span>
                          <span>·</span>
                          <span>{r.at}</span>
                        </p>
                      </div>
                      {r.previewKind && (
                        <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                          {PREVIEW_KIND_LABEL[r.previewKind] ?? r.previewKind}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Copilot bu hafta — sinyal (de-emphasize edilmiş, en altta) */}
            <section className="space-y-3">
              <SectionTitle icon={Lightning} title="Copilot bu hafta" sub="üretim sinyali" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Toplam üretim" value={kpi.total} delta={28} trend={kpi.trendRuns} icon={Lightning} hint="bu hafta" />
                <KpiCard label="Önizleme oranı" value={`${kpi.applyRate}%`} delta={6} trend={kpi.trendPreview} icon={CheckCircle} hint="uygulanabilir çıktı" />
                <KpiCard label="Ort. yanıt süresi" value={`${kpi.avgMs}ms`} delta={-12} trend={kpi.trendLatency} icon={Cpu} invert hint="düşük iyi" />
                <KpiCard label="Etkin yüzey" value={kpi.surfaces} delta={2} trend={kpi.trendSurfaces} icon={StackIcon} hint="tetiklenen sayfa" deltaSuffix="" />
              </div>
            </section>
          </div>
        ) : (
          <div ref={scrollRef} className="mp-scroll mx-auto w-full max-w-2xl flex-1 space-y-5 overflow-y-auto pb-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("group flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                  {m.role === "user" ? (
                    <><User className="size-3" /> Siz</>
                  ) : (
                    <><Robot className="size-3 text-primary" /> Copilot</>
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {m.role === "assistant" ? <StreamingText text={m.text} /> : m.text}
                </div>
                {m.role === "assistant" && (
                  <button
                    onClick={() => copyMessage(m.text)}
                    className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <Copy className="size-3" /> Kopyala
                  </button>
                )}
                {m.preview && (
                  <div className="w-full max-w-[85%]">
                    <DiffPreview
                      preview={m.preview}
                      onAlternative={() => alternative(lastUserPrompt.current)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Composer — yalnızca sohbet modunda (boşken hero composer kullanılır) */}
        {!empty && (
        <div className="mx-auto mt-auto w-full max-w-2xl pt-2">
          {!empty && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PROMPT_LIBRARY.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => submit(p.prompt)}
                  className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Bir şema, modül veya form tarif edin…"
              aria-label="Copilot'a mesaj yaz"
              className="h-11 flex-1 rounded-xl border bg-card px-4 text-sm outline-none focus:border-primary/40"
            />
            <Button
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              onClick={() => submit()}
              disabled={!input.trim()}
              aria-label="Gönder"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Enter</kbd> ile gönder · üretimler yalnızca önizlenir, siz uygulayana kadar bir şey değişmez.
          </p>
        </div>
        )}
      </PageBody>

      {/* Geçmiş oturum detay drawer'ı */}
      <RunDrawer run={activeRun} onClose={() => setActiveRun(null)} onReplay={(p) => { setActiveRun(null); submit(p); }} />
    </>
  );
}

// ── Section başlığı ─────────────────────────────────────────────────
function SectionTitle({
  icon: Icon,
  title,
  sub,
  action,
}: {
  icon: typeof Sparkles;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
      {sub && <span className="text-xs text-muted-foreground">· {sub}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

// ── Geçmiş oturum detay drawer'ı (sekmeli: Genel / Aktivite / JSON) ──
function RunDrawer({
  run,
  onClose,
  onReplay,
}: {
  run: AgentRun | null;
  onClose: () => void;
  onReplay: (prompt: string) => void;
}) {
  if (!run) return null;

  const audit: AuditEvent[] = [
    { id: "a1", action: `“${SURFACE_LABEL[run.surface] ?? run.surface}” yüzeyinde istek alındı`, actor: "Siz", at: run.at, icon: ChatCircleDots, tone: "default" },
    { id: "a2", action: "Copilot bağlamı çözümledi ve yanıt üretti", actor: "Copilot", at: run.at, icon: Cpu, tone: "primary", detail: `${run.durationMs}ms · ${run.outcome === "preview" ? "önizlemeli" : "metin"} çıktı` },
    ...(run.previewKind
      ? [{ id: "a3", action: `“${PREVIEW_KIND_LABEL[run.previewKind] ?? run.previewKind}” önizlemesi oluşturuldu`, actor: "Copilot", at: run.at, icon: Sparkles, tone: "emerald" as const }]
      : []),
  ];

  const tabs: DrawerTab[] = [
    {
      value: "genel",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">{run.prompt}</div>
          <div className="divide-y rounded-lg border">
            <div className="px-3">
              <Field label="Yüzey">{SURFACE_LABEL[run.surface] ?? run.surface}</Field>
            </div>
            <div className="px-3">
              <Field label="Sonuç">
                <Badge variant={run.outcome === "preview" ? "default" : "secondary"} className="text-[10px]">
                  {run.outcome === "preview" ? "Önizleme" : "Metin"}
                </Badge>
              </Field>
            </div>
            {run.previewKind && (
              <div className="px-3">
                <Field label="Önizleme türü" mono>{PREVIEW_KIND_LABEL[run.previewKind] ?? run.previewKind}</Field>
              </div>
            )}
            <div className="px-3">
              <Field label="Süre" mono>{run.durationMs}ms</Field>
            </div>
            <div className="px-3">
              <Field label="Zaman">{run.at}</Field>
            </div>
            <div className="px-3">
              <Field label="Çalıştırma ID" mono>{run.id}</Field>
            </div>
          </div>
        </div>
      ),
    },
    {
      value: "aktivite",
      label: "Aktivite",
      content: <AuditTimeline events={audit} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="mp-scroll overflow-auto rounded-lg border bg-background/60 p-3 font-mono text-[11px] leading-relaxed">
          <code>{JSON.stringify(run, null, 2)}</code>
        </pre>
      ),
    },
  ];

  return (
    <DetailDrawer
      open={!!run}
      onOpenChange={(v) => !v && onClose()}
      title={run.prompt.length > 48 ? run.prompt.slice(0, 48) + "…" : run.prompt}
      subtitle={`${SURFACE_LABEL[run.surface] ?? run.surface} · ${run.at}`}
      badge={
        run.previewKind ? (
          <Badge variant="outline" className="font-mono text-[10px]">
            {PREVIEW_KIND_LABEL[run.previewKind] ?? run.previewKind}
          </Badge>
        ) : undefined
      }
      tabs={tabs}
      footer={
        <Button className="gap-1.5" onClick={() => onReplay(run.prompt)}>
          <ArrowClockwise className="size-4" /> Bu istemi tekrar çalıştır
        </Button>
      }
    />
  );
}
