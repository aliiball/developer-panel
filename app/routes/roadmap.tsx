import { useMemo, useState } from "react";
import {
  Sparkle as Sparkles,
  Stack as Boxes,
  CaretUp as ChevronUp,
  Lightbulb,
  CalendarCheck,
  Wrench,
  RocketLaunch,
  ChatCircle,
  ArrowRight,
  Lightning,
  ClipboardText,
  GitBranch,
  User as UserIcon,
  Tag,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { toastUndo } from "~/lib/feedback";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { KanbanBoard, type KanbanColumn } from "~/components/delivery/KanbanBoard";
import { VotePill } from "~/components/delivery/VotePill";
import { useIssueStore } from "~/stores/issue-store";
import { useCopilotStore } from "~/stores/copilot-store";
import type { Issue, RoadmapStage } from "~/data/delivery";
import { ROADMAP_EXTRA_FEATURES } from "~/data/seed.roadmap";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  KpiCard, FilterBar, FilterChip,
  DetailDrawer, Field, AuditTimeline,
  EmptyState, type DrawerTab, type AuditEvent,
} from "~/components/enterprise";

export function meta() {
  return [{ title: "Roadmap — MetaPanel" }];
}

const STAGES: { key: RoadmapStage; title: string; accent: string; icon: typeof Lightbulb }[] = [
  { key: "proposed", title: "Öneri", accent: "var(--muted-foreground)", icon: Lightbulb },
  { key: "planned", title: "Planlandı", accent: "var(--chart-5)", icon: CalendarCheck },
  { key: "building", title: "Geliştiriliyor", accent: "var(--primary)", icon: Wrench },
  { key: "shipped", title: "Yayınlandı", accent: "var(--chart-2)", icon: RocketLaunch },
];

const STAGE_LABEL: Record<RoadmapStage, string> = {
  proposed: "Öneri", planned: "Planlandı", building: "Geliştiriliyor", shipped: "Yayınlandı",
};

const SEVERITY_LABEL: Record<Issue["severity"], string> = {
  low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik",
};

const SEVERITY_BADGE: Record<Issue["severity"], "secondary" | "outline" | "default" | "destructive"> = {
  low: "secondary", medium: "outline", high: "default", critical: "destructive",
};

// Sort dimension for cards inside each column.
type SortKey = "votes" | "recent";

export default function Roadmap() {
  const issues = useIssueStore((s) => s.issues);
  const upvote = useIssueStore((s) => s.upvote);
  const setStage = useIssueStore((s) => s.setStage);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // ── UI state ────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [modules, setModules] = useState<string[]>([]); // active module filter chips
  const [onlyMine, setOnlyMine] = useState(false);
  const [sort, setSort] = useState<SortKey>("votes");
  const [openId, setOpenId] = useState<string | null>(null);
  // optimistic vote tracking: id → extra votes applied locally this session
  const [votedDelta, setVotedDelta] = useState<Record<string, number>>({});

  // Merge store features with page-local extras, de-duped by id.
  // Store entries win (so store mutations like upvote/setStage are honoured).
  const allFeatures = useMemo<Issue[]>(() => {
    const storeFeatures = issues.filter((i) => i.type === "feature");
    const seen = new Set(storeFeatures.map((f) => f.id));
    const extras = ROADMAP_EXTRA_FEATURES.filter((f) => !seen.has(f.id));
    return [...storeFeatures, ...extras];
  }, [issues]);

  // Apply local optimistic vote deltas (extras live only here).
  const features = useMemo<Issue[]>(
    () => allFeatures.map((f) => (votedDelta[f.id] ? { ...f, votes: f.votes + votedDelta[f.id] } : f)),
    [allFeatures, votedDelta],
  );

  const allModules = useMemo(() => {
    const set = new Set<string>();
    features.forEach((f) => f.linkedModule && set.add(f.linkedModule));
    return [...set].sort();
  }, [features]);

  // ── Filtering ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return features.filter((f) => {
      if (q && !`${f.title} ${f.id} ${f.description} ${f.reporter}`.toLowerCase().includes(q)) return false;
      if (modules.length && !(f.linkedModule && modules.includes(f.linkedModule))) return false;
      if (onlyMine && f.assignee !== "mehmet") return false;
      return true;
    });
  }, [features, search, modules, onlyMine]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => (sort === "votes" ? b.votes - a.votes : 0));
    return arr;
  }, [filtered, sort]);

  const columns: KanbanColumn<Issue>[] = STAGES.map((st) => ({
    key: st.key,
    title: st.title,
    accent: st.accent,
    items: sorted.filter((f) => (f.stage ?? "proposed") === st.key),
  }));

  // ── KPI metrics ─────────────────────────────────────────────────
  const totalVotes = features.reduce((s, f) => s + f.votes, 0);
  const shipped = features.filter((f) => (f.stage ?? "proposed") === "shipped").length;
  const inFlight = features.filter((f) => ["planned", "building"].includes(f.stage ?? "proposed")).length;
  const proposed = features.filter((f) => (f.stage ?? "proposed") === "proposed").length;
  const topReq = [...features].sort((a, b) => b.votes - a.votes)[0];
  const shippedRate = features.length ? Math.round((shipped / features.length) * 100) : 0;

  // Spark trends are illustrative momentum curves for the board.
  const voteTrend = [180, 240, 310, 420, 540, 680, 820, totalVotes];
  const flightTrend = [3, 4, 4, 5, 5, 6, 6, inFlight];
  const proposedTrend = [1, 2, 2, 3, 3, 4, 4, proposed];
  const shipTrend = [10, 22, 35, 48, 60, 75, 88, shippedRate];

  // ── Actions ─────────────────────────────────────────────────────
  const isLocalOnly = (id: string) => !issues.some((i) => i.id === id);

  function handleVote(f: Issue) {
    if (isLocalOnly(f.id)) {
      // page-local extra → optimistic local increment (geri-alınabilir)
      setVotedDelta((d) => ({ ...d, [f.id]: (d[f.id] ?? 0) + 1 }));
      toastUndo(`Oy verildi: ${f.id}`, {
        description: `"${f.title}" şimdi ${f.votes + 1} oy.`,
        onUndo: () => setVotedDelta((d) => ({ ...d, [f.id]: (d[f.id] ?? 0) - 1 })),
      });
    } else {
      upvote(f.id); // store-backed → persists in store (store'da geri-al API'si yok)
      toast.success(`Oy verildi: ${f.id}`, { description: `"${f.title}" şimdi ${f.votes + 1} oy.` });
    }
  }

  function handleStage(f: Issue, v: RoadmapStage) {
    if (isLocalOnly(f.id)) {
      toast.info("Bu öneri seed kaydı; aşama değişimi oturumla sınırlı.", { description: `${f.id} → ${STAGE_LABEL[v]}` });
      return;
    }
    const prev = f.stage ?? "proposed";
    if (prev === v) return;
    setStage(f.id, v); // optimistic
    toastUndo(`Aşama güncellendi: ${f.id}`, {
      description: `${STAGE_LABEL[prev]} → ${STAGE_LABEL[v]}`,
      onUndo: () => setStage(f.id, prev),
    });
  }

  function toggleModule(m: string) {
    setModules((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]));
  }

  function handleExport() {
    const rows = filtered.map((f) => ({
      id: f.id, title: f.title, stage: f.stage ?? "proposed",
      votes: f.votes, module: f.linkedModule ?? "", assignee: f.assignee ?? "",
    }));
    const json = JSON.stringify(rows, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).catch(() => {});
    }
    toast.success("Roadmap dışa aktarıldı", { description: `${rows.length} öneri JSON olarak panoya kopyalandı.` });
  }

  const active = openId ? features.find((f) => f.id === openId) ?? null : null;

  const hasFilters = search.trim() !== "" || modules.length > 0 || onlyMine;
  const empty = filtered.length === 0;

  return (
    <>
      <PageHeader
        title="Roadmap"
        description="Özellik istekleri panosu. Oyları, aşamaları ve AI kümelemeyi yönet."
        actions={[
          {
            label: "Benzerleri Kümele", icon: Sparkles, variant: "default",
            onClick: () => queuePrompt("Benzer özellik isteklerini kümele ve birleştirme öner."),
          },
        ]}
      />
      <PageBody grid={false}>
        <div className="space-y-4">
          {/* ── KPI şeridi ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Toplam oy" value={totalVotes.toLocaleString("tr-TR")} delta={18} trend={voteTrend}
              icon={ChevronUp} hint="son 30 gün"
            />
            <KpiCard
              label="Yapımda" value={inFlight} delta={12} trend={flightTrend}
              icon={Wrench} hint="planlandı + geliştiriliyor"
            />
            <KpiCard
              label="Bekleyen öneri" value={proposed} delta={9} trend={proposedTrend}
              icon={Lightbulb} hint="triyaj bekliyor"
            />
            <KpiCard
              label="Teslim oranı" value={`%${shippedRate}`} delta={6} trend={shipTrend}
              icon={RocketLaunch} hint={`${shipped}/${features.length} yayında`}
            />
          </div>

          {/* ── En çok talep edilen ────────────────────────────── */}
          {topReq && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Lightning className="size-4" weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  En çok talep edilen: <span className="text-primary">{topReq.title}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {topReq.id} · {topReq.votes.toLocaleString("tr-TR")} oy · {STAGE_LABEL[topReq.stage ?? "proposed"]}
                </p>
              </div>
              <Button
                variant="outline" size="sm" className="ml-auto gap-1.5"
                onClick={() => setOpenId(topReq.id)}
              >
                İncele <ArrowRight className="size-3.5" />
              </Button>
            </div>
          )}

          {/* ── Filtre şeridi ──────────────────────────────────── */}
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Önerilerde ara (başlık, ID, açıklama)…"
            onExport={handleExport}
          >
            <FilterChip active={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
              Bana atanan
            </FilterChip>
            {allModules.map((m) => (
              <FilterChip
                key={m}
                active={modules.includes(m)}
                onClick={() => toggleModule(m)}
                count={features.filter((f) => f.linkedModule === m).length}
              >
                {m}
              </FilterChip>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Sırala</span>
              <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="votes" className="text-xs">Oya göre</SelectItem>
                  <SelectItem value="recent" className="text-xs">Kolon sırası</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FilterBar>

          {/* ── Board / boş durum ──────────────────────────────── */}
          {empty ? (
            <EmptyState
              icon={ClipboardText}
              variant={hasFilters ? "search" : "default"}
              title={hasFilters ? "Eşleşen öneri yok" : "Henüz öneri yok"}
              description={
                hasFilters
                  ? "Arama ve filtreleri değiştirip tekrar dene."
                  : "İlk özellik isteğini ekleyerek panoyu başlat."
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => { setSearch(""); setModules([]); setOnlyMine(false); }}
                  >
                    Filtreleri temizle
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <KanbanBoard
              columns={columns}
              getKey={(f) => f.id}
              renderCard={(f) => (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenId(f.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenId(f.id);
                    }
                  }}
                  className="w-full cursor-pointer rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/30 focus-visible:border-primary/50 focus-visible:outline-none"
                >
                  <div className="flex gap-2">
                    <span className="contents" onClick={(e) => e.stopPropagation()}>
                      <VotePill
                        votes={f.votes}
                        voted={isLocalOnly(f.id) ? (votedDelta[f.id] ?? 0) > 0 : undefined}
                        onVote={() => handleVote(f)}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{f.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{f.id}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {f.linkedModule && (
                      <Badge variant="secondary" className="gap-1 text-[9px]">
                        <Boxes className="size-2.5" />{f.linkedModule}
                      </Badge>
                    )}
                    {f.comments.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <ChatCircle className="size-2.5" />{f.comments.length}
                      </span>
                    )}
                    {f.assignee && <span className="text-[10px] text-muted-foreground">@{f.assignee}</span>}
                    <Select
                      value={f.stage ?? "proposed"}
                      onValueChange={(v) => v && handleStage(f, v as RoadmapStage)}
                    >
                      <SelectTrigger
                        className="ml-auto h-6 w-28 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.key} value={s.key} className="text-xs">{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            />
          )}
        </div>

        {/* ── Detay drawer ───────────────────────────────────────── */}
        <CardDrawer
          feature={active}
          onOpenChange={(v) => !v && setOpenId(null)}
          onVote={handleVote}
          onStage={handleStage}
          onCluster={(f) =>
            queuePrompt(`"${f.title}" (${f.id}) önerisine benzer talepleri bul ve birleştirme öner.`)
          }
          isLocalOnly={isLocalOnly}
          votedDelta={votedDelta}
        />
      </PageBody>
    </>
  );
}

// ── Detail drawer for a single feature request ───────────────────
function CardDrawer({
  feature, onOpenChange, onVote, onStage, onCluster, isLocalOnly, votedDelta,
}: {
  feature: Issue | null;
  onOpenChange: (v: boolean) => void;
  onVote: (f: Issue) => void;
  onStage: (f: Issue, v: RoadmapStage) => void;
  onCluster: (f: Issue) => void;
  isLocalOnly: (id: string) => boolean;
  votedDelta: Record<string, number>;
}) {
  const f = feature;
  if (!f) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} title="" />;
  }

  const stage = f.stage ?? "proposed";
  const stageIdx = STAGES.findIndex((s) => s.key === stage);

  const audit: AuditEvent[] = [
    {
      id: "a-created", action: "öneriyi oluşturdu", actor: f.reporter, at: f.createdAt,
      icon: Lightbulb, tone: "default",
    },
    ...(stageIdx >= 1
      ? [{ id: "a-planned", action: "roadmap'e alındı, 'Planlandı'", actor: "ürün ekibi", at: "geçen sprint", icon: CalendarCheck, tone: "primary" } as AuditEvent]
      : []),
    ...(stageIdx >= 2
      ? [{ id: "a-building", action: "geliştirmeye başladı", actor: f.assignee ?? "ekip", at: "bu sprint", icon: Wrench, tone: "amber" } as AuditEvent]
      : []),
    ...(stageIdx >= 3
      ? [{ id: "a-shipped", action: "yayınlandı", actor: "release-bot", at: "az önce", icon: RocketLaunch, tone: "emerald" } as AuditEvent]
      : []),
    {
      id: "a-vote", action: `oy sayısı ${f.votes} seviyesine ulaştı`, actor: "topluluk",
      at: "sürekli güncel", icon: ChevronUp, tone: "primary",
    },
  ];

  const general = (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>

      <div className="rounded-lg border bg-card/40 p-3">
        <Field label="Aşama">
          <span className="inline-flex items-center gap-1.5">
            {(() => { const I = STAGES[stageIdx]?.icon ?? Lightbulb; return <I className="size-3.5" />; })()}
            {STAGE_LABEL[stage]}
          </span>
        </Field>
        <Field label="Oy">
          <span className="tabular-nums">{f.votes.toLocaleString("tr-TR")}</span>
        </Field>
        <Field label="Önem">
          <Badge variant={SEVERITY_BADGE[f.severity]} className="text-[10px]">
            {SEVERITY_LABEL[f.severity]}
          </Badge>
        </Field>
        <Field label="Bildiren">
          <span className="inline-flex items-center gap-1"><UserIcon className="size-3" />{f.reporter}</span>
        </Field>
        <Field label="Atanan">{f.assignee ? `@${f.assignee}` : "—"}</Field>
        {f.linkedModule && (
          <Field label="Modül">
            <span className="inline-flex items-center gap-1"><Tag className="size-3" />{f.linkedModule}</span>
          </Field>
        )}
        <Field label="Oluşturma">{f.createdAt}</Field>
        <Field label="Kayıt ID" mono>{f.id}</Field>
      </div>

      {/* aşama ilerleme şeridi */}
      <div className="rounded-lg border bg-card/40 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Aşama ilerlemesi</p>
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
              <span
                className="h-1.5 w-full rounded-full"
                style={{ background: i <= stageIdx ? s.accent : "var(--muted)" }}
              />
              <span className={`text-[9px] ${i <= stageIdx ? "text-foreground" : "text-muted-foreground"}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Aşamayı değiştir</span>
        <Select value={stage} onValueChange={(v) => v && onStage(f, v as RoadmapStage)}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => <SelectItem key={s.key} value={s.key} className="text-xs">{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const activity = (
    <div className="space-y-4">
      <AuditTimeline events={audit} />
      {f.comments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Yorumlar</p>
          {f.comments.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card/40 p-2.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{c.author}</span>
                <Badge variant="outline" className="text-[9px]">{c.authorKind}</Badge>
                <span className="ml-auto">{c.time}</span>
              </div>
              <p className="mt-1 text-sm">{c.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Henüz yorum yok.</p>
      )}
    </div>
  );

  const raw = (
    <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(f, null, 2)}
    </pre>
  );

  const tabs: DrawerTab[] = [
    { value: "general", label: "Genel", content: general },
    { value: "activity", label: "Aktivite", content: activity },
    { value: "json", label: "JSON", content: raw },
  ];

  const voted = isLocalOnly(f.id) ? (votedDelta[f.id] ?? 0) > 0 : false;

  return (
    <DetailDrawer
      open
      onOpenChange={onOpenChange}
      title={f.title}
      subtitle={`${f.id} · ${f.votes.toLocaleString("tr-TR")} oy`}
      badge={<Badge variant="secondary" className="text-[10px]">{STAGE_LABEL[stage]}</Badge>}
      tabs={tabs}
      footer={
        <div className="flex w-full items-center gap-2 p-3">
          <Button variant="outline" size="sm" className="gap-1.5" disabled={voted} onClick={() => onVote(f)}>
            <ChevronUp className="size-3.5" /> {voted ? "Oy verildi" : "Oy ver"}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onCluster(f)}>
            <GitBranch className="size-3.5" /> Benzerleri bul
          </Button>
        </div>
      }
    />
  );
}
