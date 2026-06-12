import { Sparkles, Boxes } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { KanbanBoard, type KanbanColumn } from "~/components/delivery/KanbanBoard";
import { VotePill } from "~/components/delivery/VotePill";
import { useIssueStore } from "~/stores/issue-store";
import { useCopilotStore } from "~/stores/copilot-store";
import type { Issue, RoadmapStage } from "~/data/delivery";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";

export function meta() {
  return [{ title: "Roadmap — MetaPanel" }];
}

const STAGES: { key: RoadmapStage; title: string; accent: string }[] = [
  { key: "proposed", title: "Öneri", accent: "var(--muted-foreground)" },
  { key: "planned", title: "Planlandı", accent: "var(--chart-5)" },
  { key: "building", title: "Geliştiriliyor", accent: "var(--primary)" },
  { key: "shipped", title: "Yayınlandı", accent: "var(--chart-2)" },
];

export default function Roadmap() {
  const issues = useIssueStore((s) => s.issues);
  const upvote = useIssueStore((s) => s.upvote);
  const setStage = useIssueStore((s) => s.setStage);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  const features = issues.filter((i) => i.type === "feature");
  const columns: KanbanColumn<Issue>[] = STAGES.map((st) => ({
    key: st.key,
    title: st.title,
    accent: st.accent,
    items: features.filter((f) => (f.stage ?? "proposed") === st.key),
  }));

  return (
    <>
      <PageHeader
        title="Roadmap"
        description="Özellik istekleri panosu. Oyları, aşamaları ve AI kümelemeyi yönet."
        actions={[
          { label: "Benzerleri Kümele", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Benzer özellik isteklerini kümele ve birleştirme öner.") },
        ]}
      />
      <PageBody grid={false}>
        <KanbanBoard
          columns={columns}
          getKey={(f) => f.id}
          renderCard={(f) => (
            <div className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/30">
              <div className="flex gap-2">
                <VotePill votes={f.votes} onVote={() => upvote(f.id)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{f.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{f.id}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {f.linkedModule && (
                  <Badge variant="secondary" className="gap-1 text-[9px]"><Boxes className="size-2.5" />{f.linkedModule}</Badge>
                )}
                {f.assignee && <span className="text-[10px] text-muted-foreground">@{f.assignee}</span>}
                <Select value={f.stage ?? "proposed"} onValueChange={(v) => v && setStage(f.id, v as RoadmapStage)}>
                  <SelectTrigger className="ml-auto h-6 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s.key} value={s.key} className="text-xs">{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        />
      </PageBody>
    </>
  );
}
