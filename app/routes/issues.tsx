import { useState } from "react";
import { useNavigate } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Sparkles, Smartphone, Mail, PenLine, Bug } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { DataTable } from "~/components/ui/data-table";
import { useIssueStore } from "~/stores/issue-store";
import { useCopilotStore } from "~/stores/copilot-store";
import type { Issue, IssueSeverity } from "~/data/delivery";
import { SeverityBadge, IssueStatusBadge } from "~/components/delivery/badges";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Issues — MetaPanel" }];
}

const SOURCE_ICON = { "in-app": Smartphone, email: Mail, manual: PenLine } as const;

export default function Issues() {
  const navigate = useNavigate();
  const issues = useIssueStore((s) => s.issues);
  const submitReport = useIssueStore((s) => s.submitReport);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium" as IssueSeverity, reporter: "" });

  const bugs = issues.filter((i) => i.type === "bug");
  const openCount = bugs.filter((b) => b.status === "triage" || b.status === "in-progress").length;
  const critical = bugs.filter((b) => b.severity === "critical" && b.status !== "closed").length;
  const triage = bugs.filter((b) => b.status === "triage").length;
  const resolved = bugs.filter((b) => b.status === "resolved").length;

  const columns: ColumnDef<Issue, unknown>[] = [
    { accessorKey: "id", header: "ID", cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: "title", header: "Başlık", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    { accessorKey: "severity", header: "Önem", cell: ({ getValue }) => <SeverityBadge severity={getValue() as string} /> },
    { accessorKey: "status", header: "Durum", cell: ({ getValue }) => <IssueStatusBadge status={getValue() as string} /> },
    {
      accessorKey: "source", header: "Kaynak",
      cell: ({ getValue }) => {
        const s = getValue() as keyof typeof SOURCE_ICON;
        const Icon = SOURCE_ICON[s];
        return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Icon className="size-3.5" />{s}</span>;
      },
    },
    { accessorKey: "reporter", header: "Raporlayan", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: "assignee", header: "Atanan", cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? "—"}</span> },
    { accessorKey: "createdAt", header: "Yaş", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
  ];

  function submit() {
    if (!form.title.trim()) return;
    const id = submitReport({
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
      reporter: form.reporter.trim() || "müşteri@app.com",
      source: "in-app",
      aiSuggested: { severity: form.severity },
    });
    toast.success("Yeni müşteri raporu alındı — AI triyaj ediyor…", { description: id });
    setForm({ title: "", description: "", severity: "medium", reporter: "" });
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Issues"
        description="Hata raporlarını al, triyaj et ve çözüme ulaştır."
        actions={[
          { label: "Müşteri Raporu Simüle Et", icon: Smartphone, variant: "default", onClick: () => setOpen(true) },
          { label: "AI Triyaj", icon: Sparkles, onClick: () => queuePrompt("Açık hata raporlarını önem derecesine göre triyaj et ve olası kopyaları grupla.") },
        ]}
      />
      <PageBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Counter label="Açık" value={openCount} icon={Bug} />
          <Counter label="Kritik" value={critical} tone="text-red-400" />
          <Counter label="Triyajda" value={triage} tone="text-amber-400" />
          <Counter label="Çözüldü" value={resolved} tone="text-emerald-400" />
        </div>
        <DataTable columns={columns} data={bugs} searchPlaceholder="Hata ara…" onRowClick={(i) => navigate(`/issues/${i.id}`)} />
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="size-4 text-primary" /> Müşteri Hata Raporu</DialogTitle>
          </DialogHeader>
          <p className="-mt-1 text-xs text-muted-foreground">Uygulama içi widget'tan gelen bir raporu simüle eder.</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Başlık</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Kısa özet" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Açıklama</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ne oldu?" className="min-h-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Önem</Label>
                <Select value={form.severity} onValueChange={(v) => v && setForm({ ...form, severity: v as IssueSeverity })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>E-posta</Label>
                <Input value={form.reporter} onChange={(e) => setForm({ ...form, reporter: e.target.value })} placeholder="musteri@app.com" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={submit}>Raporu Gönder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Counter({ label, value, icon: Icon, tone }: { label: string; value: number; icon?: typeof Bug; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />} {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
