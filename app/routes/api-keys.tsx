import { useState } from "react";
import {
  Plus,
  Key as KeyRound,
  Copy,
  ArrowClockwise as RotateCw,
  Trash as Trash2,
  Check,
  Lock,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { SEED_API_KEYS, type ApiKey } from "~/data/platform";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "API Keys — MetaPanel" }];
}

const ENV_TONE: Record<string, string> = { prod: "text-emerald-400", staging: "text-amber-400", dev: "text-sky-400" };

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>(SEED_API_KEYS);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  function create() {
    if (!name.trim()) return;
    const full = `mp_live_sk_${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
    setKeys((p) => [{ id: `k_${p.length}`, name: name.trim(), prefix: full.slice(0, 16), scopes: ["read"], createdAt: "az önce", lastUsed: "hiç", env: "prod", revoked: false }, ...p]);
    setCreated(full);
    setName("");
  }
  function revoke(id: string) {
    setKeys((p) => p.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
    toast.success("Anahtar iptal edildi");
  }
  function rotate(id: string) {
    const np = `mp_live_sk_${Math.random().toString(16).slice(2, 6)}`;
    setKeys((p) => p.map((k) => (k.id === id ? { ...k, prefix: np, lastUsed: "hiç", createdAt: "az önce" } : k)));
    toast.success("Anahtar yenilendi (rotate)");
  }

  return (
    <>
      <PageHeader
        title="API Keys & Tokens"
        description="API anahtarı yaşam döngüsü: oluştur, scope, rotate, revoke. (Settings'teki tek anahtarın yerine geçer.)"
        actions={[{ label: "Yeni Anahtar", icon: Plus, variant: "default", onClick: () => { setCreated(null); setOpen(true); } }]}
      />
      <PageBody>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Ad</th>
                <th className="px-4 py-2.5 font-medium">Anahtar</th>
                <th className="px-4 py-2.5 font-medium">Scope</th>
                <th className="px-4 py-2.5 font-medium">Son kullanım</th>
                <th className="px-4 py-2.5 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className={cn("border-b last:border-0 hover:bg-accent/30", k.revoked && "opacity-50")}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{k.name}</span>
                      <Badge variant="outline" className={cn("text-[9px]", ENV_TONE[k.env])}>{k.env}</Badge>
                      {k.revoked && <Badge variant="secondary" className="text-[9px] text-red-400">iptal</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><code className="font-mono text-xs text-muted-foreground">{k.prefix}••••</code></td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">{k.scopes.map((s) => <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>)}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{k.lastUsed}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {!k.revoked && (
                        <>
                          <button onClick={() => rotate(k.id)} title="Rotate" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><RotateCw className="size-3.5" /></button>
                          <button onClick={() => revoke(k.id)} title="Revoke" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="size-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Yeni API Anahtarı</DialogTitle></DialogHeader>
          {created ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                <Lock className="mt-0.5 size-4 shrink-0" />
                <span>Bu anahtar yalnızca bir kez gösterilir. Güvenli bir yere kaydet.</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
                <code className="flex-1 break-all font-mono text-xs">{created}</code>
                <Button size="icon" variant="outline" className="size-8 shrink-0" onClick={() => { navigator.clipboard?.writeText(created); toast.success("Kopyalandı"); }}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <Button className="w-full gap-1.5" onClick={() => setOpen(false)}><Check className="size-4" /> Tamam</Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Anahtar adı</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Mobile app" autoFocus onKeyDown={(e) => e.key === "Enter" && create()} />
                <p className="text-xs text-muted-foreground">Scope'lar varsayılan olarak <code className="font-mono">read</code> ile başlar.</p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={create}>Oluştur</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
