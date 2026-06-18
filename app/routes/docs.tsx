import { useMemo, useState } from "react";
import {
  Sparkle as Sparkles,
  BookOpen,
  Hash,
  Plugs,
  Code,
  Lightning,
  Lock,
  LockOpen,
  Copy,
  Check,
  CaretRight,
  FileText,
  Clock,
  ArrowSquareOut,
  ListMagnifyingGlass,
  GitBranch,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { ENDPOINTS, type Endpoint } from "~/data/endpoints";
import {
  DOC_GUIDES,
  DOC_LANGS,
  ENDPOINT_META,
  type DocGuide,
  type DocLang,
} from "~/data/seed.docs";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  KpiCard,
  FilterBar,
  FilterChip,
  EmptyState,
  DetailDrawer,
  Field,
  AuditTimeline,
  type AuditEvent,
} from "~/components/enterprise";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Docs — MetaPanel" }];
}

const METHOD_TONE: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-sky-400",
  PUT: "text-amber-400",
  PATCH: "text-amber-400",
  DELETE: "text-red-400",
};

const GROUP_ICON: Record<DocGuide["group"], typeof BookOpen> = {
  "Başlangıç": Lightning,
  "Çekirdek Kavramlar": BookOpen,
  "İleri Düzey": Code,
};

/* ── Kopyalanabilir kod bloğu (dil sekmeli kullanım için tek blok) ── */
function CodeBlock({ code, id }: { code: string; id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    toast.success("Kod panoya kopyalandı");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group/code relative overflow-hidden rounded-lg border bg-muted/30">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        aria-label="Kodu kopyala"
        className="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover/code:opacity-100"
      >
        {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
      </Button>
      <pre className="mp-scroll overflow-x-auto p-3 text-xs leading-relaxed">
        <code id={id} className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

/* ── Dil sekmeli kod örneği ── */
function LangSamples({
  samples,
  lang,
  onLang,
  idPrefix,
}: {
  samples: NonNullable<DocGuide["samples"]>;
  lang: DocLang;
  onLang: (l: DocLang) => void;
  idPrefix: string;
}) {
  const available = samples.map((s) => s.lang);
  const active = available.includes(lang) ? lang : available[0];
  const sample = samples.find((s) => s.lang === active)!;
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {DOC_LANGS.filter((l) => available.includes(l.id)).map((l) => (
          <button
            key={l.id}
            onClick={() => onLang(l.id)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              active === l.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
      <CodeBlock code={sample.code} id={`${idPrefix}-${active}`} />
    </div>
  );
}

export default function Docs() {
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [active, setActive] = useState("quickstart");
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<DocGuide["group"] | "all">("all");
  const [lang, setLang] = useState<DocLang>("curl");
  const [methodFilter, setMethodFilter] = useState<Endpoint["method"] | "all">("all");
  const [selected, setSelected] = useState<Endpoint | null>(null);

  // ── KPI'lar ──────────────────────────────────────────────────────
  const autoCount = ENDPOINTS.filter((e) => e.auto).length;
  const modelCount = new Set(ENDPOINTS.map((e) => e.model)).size;
  const sampleCount = DOC_GUIDES.reduce((n, g) => n + (g.samples?.length ?? 0), 0);

  // ── Rehber filtreleme (arama + grup) ─────────────────────────────
  const q = query.trim().toLowerCase();
  const guides = useMemo(
    () =>
      DOC_GUIDES.filter((g) => {
        if (groupFilter !== "all" && g.group !== groupFilter) return false;
        if (!q) return true;
        return (
          g.title.toLowerCase().includes(q) ||
          g.summary.toLowerCase().includes(q) ||
          g.body.toLowerCase().includes(q)
        );
      }),
    [q, groupFilter],
  );

  // ── Endpoint filtreleme (arama + method) ─────────────────────────
  const endpoints = useMemo(
    () =>
      ENDPOINTS.filter((e) => {
        if (methodFilter !== "all" && e.method !== methodFilter) return false;
        if (!q) return true;
        return (
          e.path.toLowerCase().includes(q) ||
          e.model.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
        );
      }),
    [q, methodFilter],
  );

  const byModel = endpoints.reduce<Record<string, Endpoint[]>>((acc, e) => {
    (acc[e.model] ??= []).push(e);
    return acc;
  }, {});

  // Yan gezinme: grup → rehberler + endpoint referansı.
  const guideGroups: DocGuide["group"][] = ["Başlangıç", "Çekirdek Kavramlar", "İleri Düzey"];

  const totalResults = guides.length + endpoints.length;

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Seçili endpoint için drawer içeriği ──────────────────────────
  const meta = selected ? ENDPOINT_META[selected.id] : undefined;
  const auditEvents: AuditEvent[] = meta?.changelog?.length
    ? meta.changelog.map((c, i) => ({
        id: `cl-${i}`,
        action: c.note,
        actor: "API",
        at: c.at,
        icon: GitBranch,
        tone: c.tone ?? "default",
      }))
    : [
        {
          id: "cl-0",
          action: selected?.auto ? "CRUD üreticisi tarafından otomatik üretildi." : "El ile tanımlandı.",
          actor: selected?.auto ? "Codegen" : "Platform",
          at: "yayında",
          icon: GitBranch,
          tone: "default",
        },
      ];

  const curlFor = (e: Endpoint) => {
    const base = `https://api.metapanel.dev/v1${e.path.replace(/^\/api/, "")}`;
    const auth = e.auth ? ' \\\n  -H "Authorization: Bearer $METAPANEL_KEY"' : "";
    if (e.method === "GET" || e.method === "DELETE")
      return `curl -X ${e.method} ${base}${auth}`;
    return `curl -X ${e.method} ${base}${auth} \\\n  -H "Content-Type: application/json" \\\n  -d '{ … }'`;
  };

  return (
    <>
      <PageHeader
        title="Docs"
        description="Otomatik üretilen API dokümanları — endpoint referansı, kod örnekleri ve rehberler."
        actions={[
          {
            label: "OpenAPI indir",
            icon: ArrowSquareOut,
            variant: "outline",
            onClick: () => toast.success("openapi.json indiriliyor…"),
          },
          {
            label: "AI ile Doküman",
            icon: Sparkles,
            variant: "default",
            onClick: () =>
              queuePrompt("Product CRUD endpoint'leri için örneklerle dokümantasyon yaz."),
          },
        ]}
      />
      <PageBody grid={false} className="space-y-6">
        {/* KPI şeridi */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Toplam Endpoint"
            value={ENDPOINTS.length}
            delta={4}
            trend={[38, 40, 42, 44, 45, 47, ENDPOINTS.length]}
            icon={Plugs}
            hint="son 30g"
          />
          <KpiCard
            label="Otomatik Üretilen"
            value={autoCount}
            delta={6}
            trend={[30, 32, 35, 38, 40, 43, autoCount]}
            icon={Lightning}
            hint="CRUD codegen"
          />
          <KpiCard
            label="Belgelenen Model"
            value={modelCount}
            delta={2}
            trend={[6, 7, 7, 8, 9, 10, modelCount]}
            icon={BookOpen}
          />
          <KpiCard
            label="Kod Örneği"
            value={sampleCount}
            delta={12}
            trend={[10, 12, 14, 16, 18, 22, sampleCount]}
            icon={Code}
            hint="4 dil"
          />
        </div>

        {/* Filtre şeridi */}
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Rehber, endpoint, path veya açıklama ara…"
          onExport={() => toast.success("Dokümantasyon Markdown olarak dışa aktarıldı")}
        >
          <FilterChip active={groupFilter === "all"} onClick={() => setGroupFilter("all")}>
            Tüm Rehberler
          </FilterChip>
          {guideGroups.map((g) => (
            <FilterChip
              key={g}
              active={groupFilter === g}
              onClick={() => setGroupFilter(g)}
              count={DOC_GUIDES.filter((d) => d.group === g).length}
            >
              {g}
            </FilterChip>
          ))}
        </FilterBar>

        {q && (
          <p className="-mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{totalResults}</span> sonuç
            bulundu — <span className="tabular-nums">{guides.length}</span> rehber,{" "}
            <span className="tabular-nums">{endpoints.length}</span> endpoint.
          </p>
        )}

        {/* İçerik: yan gezinme + makale */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_1fr]">
          {/* Yan gezinme */}
          <aside className="mp-scroll space-y-4 overflow-y-auto lg:sticky lg:top-0 lg:max-h-[calc(100vh-22rem)]">
            {guideGroups.map((group) => {
              const items = guides.filter((g) => g.group === group);
              if (items.length === 0) return null;
              const GIcon = GROUP_ICON[group];
              return (
                <div key={group}>
                  <p className="flex items-center gap-1.5 px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    <GIcon className="size-3" /> {group}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => scrollTo(g.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                          active === g.id
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent/50",
                        )}
                      >
                        <Hash className="size-3.5 shrink-0" />
                        <span className="truncate">{g.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div>
              <p className="flex items-center gap-1.5 px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                <ListMagnifyingGlass className="size-3" /> Referans
              </p>
              <button
                onClick={() => scrollTo("endpoints")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                  active === "endpoints"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                <Plugs className="size-3.5 shrink-0" /> Endpoint Referansı
                <Badge variant="secondary" className="ml-auto tabular-nums">
                  {endpoints.length}
                </Badge>
              </button>
            </div>
          </aside>

          {/* Makale + referans */}
          <article className="mp-scroll min-w-0 max-w-3xl space-y-8 overflow-y-auto pb-10 lg:max-h-[calc(100vh-22rem)]">
            {guides.length === 0 && endpoints.length === 0 ? (
              <EmptyState
                icon={FileText}
                variant="search"
                title="Eşleşen doküman yok"
                description={`"${query}" için rehber veya endpoint bulunamadı. Arama terimini sadeleştirmeyi deneyin.`}
                action={
                  <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                    Aramayı temizle
                  </Button>
                }
              />
            ) : (
              <>
                {guides.length === 0 && q ? (
                  <EmptyState
                    icon={BookOpen}
                    variant="search"
                    title="Eşleşen rehber yok"
                    description="Bu arama yalnızca endpoint'lerle eşleşti. Aşağıdaki referansa bakın."
                  />
                ) : (
                  guides.map((g) => {
                    const GIcon = GROUP_ICON[g.group];
                    return (
                      <section key={g.id} id={`doc-${g.id}`} className="scroll-mt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <GIcon className="size-4 text-primary" /> {g.title}
                          </h2>
                          <Badge variant="outline" className="text-[10px]">
                            {g.group}
                          </Badge>
                          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="size-3" /> {g.readMin} dk · {g.updated}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {g.body}
                        </p>
                        {g.samples && g.samples.length > 0 && (
                          <LangSamples
                            samples={g.samples}
                            lang={lang}
                            onLang={setLang}
                            idPrefix={g.id}
                          />
                        )}
                      </section>
                    );
                  })
                )}

                {/* Endpoint Referansı */}
                <section id="doc-endpoints" className="scroll-mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <Plugs className="size-4 text-primary" /> Endpoint Referansı
                    </h2>
                    <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                      {endpoints.length}/{ENDPOINTS.length} uç
                    </span>
                  </div>

                  {/* Method filtreleri */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <FilterChip active={methodFilter === "all"} onClick={() => setMethodFilter("all")}>
                      Tümü
                    </FilterChip>
                    {(["GET", "POST", "PATCH", "PUT", "DELETE"] as const).map((m) => {
                      const cnt = ENDPOINTS.filter((e) => e.method === m).length;
                      if (cnt === 0) return null;
                      return (
                        <FilterChip
                          key={m}
                          active={methodFilter === m}
                          onClick={() => setMethodFilter(m)}
                          count={cnt}
                        >
                          {m}
                        </FilterChip>
                      );
                    })}
                  </div>

                  {endpoints.length === 0 ? (
                    <EmptyState
                      className="mt-3"
                      icon={Plugs}
                      variant="search"
                      title="Eşleşen endpoint yok"
                      description="Method filtresini veya aramayı değiştirin."
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMethodFilter("all");
                            setQuery("");
                          }}
                        >
                          Filtreleri sıfırla
                        </Button>
                      }
                    />
                  ) : (
                    <div className="mt-3 space-y-4">
                      {Object.entries(byModel).map(([model, eps]) => (
                        <div key={model} className="overflow-hidden rounded-xl border bg-card">
                          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
                            <span className="text-sm font-medium">{model}</span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {eps.length} uç
                            </span>
                          </div>
                          <div className="divide-y">
                            {eps.map((e) => (
                              <button
                                key={e.id}
                                onClick={() => setSelected(e)}
                                className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-accent/40"
                              >
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "w-14 justify-center font-mono text-[10px]",
                                    METHOD_TONE[e.method],
                                  )}
                                >
                                  {e.method}
                                </Badge>
                                <code className="font-mono text-xs">{e.path}</code>
                                {e.auth ? (
                                  <Lock className="size-3 shrink-0 text-muted-foreground/60" />
                                ) : (
                                  <LockOpen className="size-3 shrink-0 text-amber-400/70" />
                                )}
                                <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:block">
                                  {e.description}
                                </span>
                                <CaretRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </article>
        </div>
      </PageBody>

      {/* Endpoint detay drawer'ı */}
      <DetailDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={
          selected ? (
            <span className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("font-mono text-[10px]", METHOD_TONE[selected.method])}
              >
                {selected.method}
              </Badge>
              <code className="font-mono text-sm">{selected.path}</code>
            </span>
          ) : (
            ""
          )
        }
        subtitle={selected?.description}
        badge={
          selected ? (
            <Badge variant={selected.auto ? "secondary" : "outline"} className="text-[10px]">
              {selected.auto ? "Otomatik" : "El ile"}
            </Badge>
          ) : undefined
        }
        tabs={
          selected
            ? [
                {
                  value: "overview",
                  label: "Genel",
                  content: (
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-card/50">
                        <Field label="Model">{selected.model}</Field>
                        <Field label="Method" mono>
                          {selected.method}
                        </Field>
                        <Field label="Path" mono>
                          {selected.path}
                        </Field>
                        <Field label="Kimlik doğrulama">
                          {selected.auth ? "Gerekli (Bearer)" : "Gerekmez"}
                        </Field>
                        <Field label="Kaynak">{selected.auto ? "CRUD codegen" : "Custom"}</Field>
                      </div>

                      {meta?.params && meta.params.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                            Parametreler
                          </p>
                          <div className="overflow-hidden rounded-lg border">
                            {meta.params.map((p) => (
                              <div
                                key={p.name}
                                className="flex items-start gap-2 border-b px-3 py-2 text-xs last:border-0"
                              >
                                <code className="font-mono text-primary">{p.name}</code>
                                <span className="text-muted-foreground">{p.type}</span>
                                {p.required && (
                                  <Badge variant="destructive" className="text-[9px]">
                                    zorunlu
                                  </Badge>
                                )}
                                <span className="ml-auto text-right text-muted-foreground">
                                  {p.desc}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                          İstek örneği
                        </p>
                        <CodeBlock code={curlFor(selected)} id={`req-${selected.id}`} />
                      </div>
                    </div>
                  ),
                },
                {
                  value: "activity",
                  label: "Değişim",
                  content: <AuditTimeline events={auditEvents} />,
                },
                {
                  value: "json",
                  label: "JSON",
                  content: (
                    <div className="space-y-3">
                      {meta?.sampleResponse && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                            Örnek yanıt
                          </p>
                          <CodeBlock code={meta.sampleResponse} id={`res-${selected.id}`} />
                        </div>
                      )}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                          Tanım
                        </p>
                        <CodeBlock
                          code={JSON.stringify(selected, null, 2)}
                          id={`def-${selected.id}`}
                        />
                      </div>
                    </div>
                  ),
                },
              ]
            : undefined
        }
        footer={
          selected ? (
            <div className="flex w-full items-center gap-2 p-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard?.writeText(curlFor(selected)).catch(() => {});
                  toast.success("cURL kopyalandı");
                }}
              >
                <Copy className="size-3.5" /> cURL kopyala
              </Button>
              <Button
                variant="default"
                size="sm"
                className="ml-auto gap-1.5"
                onClick={() =>
                  queuePrompt(
                    `${selected.method} ${selected.path} endpoint'i için örneklerle ayrıntılı dokümantasyon yaz.`,
                  )
                }
              >
                <Sparkles className="size-3.5" /> AI ile genişlet
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}
