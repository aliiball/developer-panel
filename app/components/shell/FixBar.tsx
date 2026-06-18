import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Wrench,
  GitCommit as GitCommitHorizontal,
  Check,
  X,
} from "@phosphor-icons/react";
import { useChangeSetStore } from "~/stores/change-set-store";
import { useIssueStore } from "~/stores/issue-store";
import { ALL_NAV } from "~/data/nav";
import { Button } from "~/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

function surfaceLabel(pathname: string): string {
  if (pathname.startsWith("/schema/")) return "Schema (model)";
  const item = ALL_NAV.find((n) => n.to !== "/" && (pathname === n.to || pathname.startsWith(n.to + "/")));
  return item?.label ?? "Panel";
}

// Global banner shown across every page while an issue fix is in progress.
// Lets the developer record what they changed and complete the fix.
export function FixBar() {
  const activeIssueId = useChangeSetStore((s) => s.activeIssueId);
  const sets = useChangeSetStore((s) => s.sets);
  const logChange = useChangeSetStore((s) => s.logChange);
  const complete = useChangeSetStore((s) => s.complete);
  const cancelFix = useChangeSetStore((s) => s.cancelFix);
  const setStatus = useIssueStore((s) => s.setStatus);
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");

  const cs = activeIssueId ? sets.find((x) => x.issueId === activeIssueId) : undefined;
  if (!activeIssueId || !cs) return null;

  const surface = surfaceLabel(location.pathname);

  function openLog() {
    setSummary(`${surface} güncellendi`);
    setOpen(true);
  }
  function saveLog() {
    if (!summary.trim()) return;
    logChange(surface, summary.trim());
    toast.success("Değişiklik kaydedildi", { description: `${surface} → ${cs!.issueId}` });
    setSummary("");
    setOpen(false);
  }
  function finish() {
    complete(activeIssueId!);
    setStatus(activeIssueId!, "resolved");
    toast.success("Geliştirme tamamlandı — issue çözüldü", { description: `${cs!.issueId} · ${cs!.changes.length} değişiklik yayına hazır` });
    navigate(`/issues/${activeIssueId}`);
  }

  return (
    <>
      <div className="z-10 flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
        <Wrench className="size-4 shrink-0 text-amber-400" />
        <span className="text-amber-200">
          Düzeltiliyor: <span className="font-mono font-medium">{cs.issueId}</span>
          <span className="ml-2 text-amber-200/70">{cs.issueTitle}</span>
        </span>
        <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-300">
          {cs.changes.length} değişiklik
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 gap-1.5 border-amber-500/40 text-xs" onClick={openLog}>
            <GitCommitHorizontal className="size-3.5" /> Değişiklik Kaydet
          </Button>
          <Button size="sm" className="h-7 gap-1.5 bg-amber-500 text-xs text-amber-950 hover:bg-amber-400" onClick={finish}>
            <Check className="size-3.5" /> Tamamla & Çözüldü
          </Button>
          <Button size="icon" variant="ghost" className="size-7 text-amber-300" onClick={cancelFix} title="Oturumu bırak">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Değişiklik Kaydet — {cs.issueId}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Yüzey: <span className="font-mono text-foreground">{surface}</span></Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ne değiştirdin?" className="min-h-20" autoFocus />
            <p className="text-xs text-muted-foreground">Bu kayıt change set'e eklenir ve deploy sırasında changelog'a girer.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={saveLog}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
