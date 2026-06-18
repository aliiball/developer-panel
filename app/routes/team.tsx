import { useState } from "react";
import { Link } from "react-router";
import {
  UserPlus,
  Sparkle as Sparkles,
  ShieldCheck,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SEED_MEMBERS, ROLE_OPTIONS, type Member, type MemberStatus } from "~/data/platform";
import { StatusBadge, type Tone } from "~/components/delivery/badges";
import { useCopilotStore } from "~/stores/copilot-store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Team — MetaPanel" }];
}

const STATUS_TONE: Record<MemberStatus, Tone> = { active: "emerald", invited: "amber", suspended: "muted" };
const STATUS_LABEL: Record<MemberStatus, string> = { active: "aktif", invited: "davetli", suspended: "askıda" };

export default function Team() {
  const [members, setMembers] = useState<Member[]>(SEED_MEMBERS);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  function setRoleFor(id: string, r: string) {
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, role: r } : m)));
  }
  function invite() {
    if (!email.trim()) return;
    setMembers((p) => [...p, { id: `inv_${p.length}`, name: "—", email: email.trim(), role, status: "invited", lastActive: "davet gönderildi", hue: 120 }]);
    toast.success("Davet gönderildi", { description: email });
    setEmail(""); setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Team & Members"
        description="Üyeler, davetler ve roller. Roller Permissions matrisinde tanımlanır."
        actions={[
          { label: "İzin Öner", icon: Sparkles, onClick: () => queuePrompt("Editor rolü için makul bir izin seti öner.") },
          { label: "Üye Davet Et", icon: UserPlus, variant: "default", onClick: () => setOpen(true) },
        ]}
      />
      <PageBody>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Üye</th>
                <th className="px-4 py-2.5 font-medium">Rol</th>
                <th className="px-4 py-2.5 font-medium">Durum</th>
                <th className="px-4 py-2.5 font-medium text-right">Son aktiflik</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: `oklch(0.55 0.15 ${m.hue})` }}>
                        {m.name !== "—" ? m.name.split(" ").map((s) => s[0]).join("").slice(0, 2) : "?"}
                      </span>
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Select value={m.role} onValueChange={(v) => v && setRoleFor(m.id, v)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge label={STATUS_LABEL[m.status]} tone={STATUS_TONE[m.status]} /></td>
                  <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{m.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/permissions" className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <ShieldCheck className="size-3.5" /> Rol izinlerini Permissions'ta düzenle
        </Link>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Üye Davet Et</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kisi@acme.com" autoFocus onKeyDown={(e) => e.key === "Enter" && invite()} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={invite}>Davet Gönder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
