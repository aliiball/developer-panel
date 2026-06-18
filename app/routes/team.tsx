import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  UserPlus,
  Sparkle as Sparkles,
  ShieldCheck,
  Users,
  EnvelopeSimple,
  Prohibit,
  CheckCircle,
  UsersThree,
  PencilSimple,
  ArrowCounterClockwise,
  IdentificationCard,
  Fingerprint,
  MapPin,
  Clock,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { ROLE_OPTIONS, type Member, type MemberStatus } from "~/data/platform";
import {
  TEAM_MEMBERS, TEAM_DETAIL, EMPTY_DETAIL, type MemberDetail,
} from "~/data/seed.team";
import { StatusBadge, type Tone } from "~/components/delivery/badges";
import { useCopilotStore } from "~/stores/copilot-store";
import {
  EmptyState, TableSkeleton, KpiSkeleton, KpiCard,
  FilterBar, FilterChip, BulkBar, DetailDrawer, Field, AuditTimeline,
  type DrawerTab,
} from "~/components/enterprise";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Team — MetaPanel" }];
}

const STATUS_TONE: Record<MemberStatus, Tone> = { active: "emerald", invited: "amber", suspended: "muted" };
const STATUS_LABEL: Record<MemberStatus, string> = { active: "aktif", invited: "davetli", suspended: "askıda" };
const ROLE_TONE: Record<string, Tone> = { Admin: "violet", Developer: "sky", Editor: "amber", Viewer: "muted" };

type StatusFilter = "all" | MemberStatus;

function initials(name: string) {
  return name !== "—" ? name.split(" ").map((s) => s[0]).join("").slice(0, 2) : "?";
}

function detailFor(id: string): MemberDetail {
  return TEAM_DETAIL[id] ?? EMPTY_DETAIL;
}

function Avatar({ m, size = 32 }: { m: Member; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ width: size, height: size, background: `oklch(0.55 0.15 ${m.hue})` }}
    >
      {initials(m.name)}
    </span>
  );
}

export default function Team() {
  const [members, setMembers] = useState<Member[]>(TEAM_MEMBERS);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");

  const queuePrompt = useCopilotStore((s) => s.queuePrompt);

  // İlk yükleme skeleton'u — gerçek async hissi.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 360);
    return () => clearTimeout(t);
  }, []);

  // ── Türetilmiş sayaçlar ──────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { active: 0, invited: 0, suspended: 0, admin: 0, mfa: 0 };
    for (const m of members) {
      c[m.status]++;
      if (m.role === "Admin") c.admin++;
      if (detailFor(m.id).mfa) c.mfa++;
    }
    return c;
  }, [members]);

  const mfaPct = members.length ? Math.round((counts.mfa / members.length) * 100) : 0;

  // ── Filtreleme ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (roleFilter && m.role !== roleFilter) return false;
      if (q && !(m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [members, query, status, roleFilter]);

  const hasFilter = status !== "all" || roleFilter !== null || query.trim() !== "";
  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  // ── Mutasyonlar ──────────────────────────────────────────────────
  function setRoleFor(id: string, r: string) {
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, role: r } : m)));
    toast.success("Rol güncellendi", { description: `${id} → ${r}` });
  }

  function bulkRole(r: string) {
    const ids = [...selected];
    setMembers((p) => p.map((m) => (selected.has(m.id) ? { ...m, role: r } : m)));
    toast.success(`${ids.length} üyenin rolü ${r} yapıldı`, {
      action: { label: "Geri al", onClick: () => toast.message("Geri alındı (demo)") },
    });
    setSelected(new Set());
  }

  function bulkStatus(next: MemberStatus) {
    const ids = [...selected];
    setMembers((p) => p.map((m) => (selected.has(m.id) ? { ...m, status: next } : m)));
    toast.success(`${ids.length} üye ${STATUS_LABEL[next]} yapıldı`, {
      action: { label: "Geri al", onClick: () => toast.message("Geri alındı (demo)") },
    });
    setSelected(new Set());
  }

  function setStatusFor(id: string, next: MemberStatus) {
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, status: next } : m)));
    toast.success(`Üye ${STATUS_LABEL[next]} yapıldı`);
  }

  function toggleRow(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((m) => m.id)));
  }

  function invite() {
    const e = email.trim();
    if (!e || !e.includes("@")) {
      toast.error("Geçerli bir e-posta gir");
      return;
    }
    setMembers((p) => [
      { id: `inv_${Date.now()}`, name: "—", email: e, role, status: "invited", lastActive: "davet gönderildi", hue: Math.floor(Math.random() * 360) },
      ...p,
    ]);
    toast.success("Davet gönderildi", { description: `${e} · ${role}` });
    setEmail("");
    setInviteOpen(false);
  }

  function exportData() {
    toast.success("Üye listesi dışa aktarıldı", { description: `${filtered.length} kayıt · members.csv` });
  }

  const active = activeId ? members.find((m) => m.id === activeId) ?? null : null;
  const detail = active ? detailFor(active.id) : EMPTY_DETAIL;

  // ── Drawer sekmeleri ─────────────────────────────────────────────
  const tabs: DrawerTab[] = active
    ? [
        {
          value: "genel",
          label: "Genel",
          content: (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar m={active} size={44} />
                <div className="min-w-0">
                  <div className="font-medium">{active.name}</div>
                  <div className="text-xs text-muted-foreground">{detail.title}</div>
                </div>
              </div>
              <div className="divide-y rounded-lg border bg-card/40 px-3">
                <Field label="E-posta" mono>{active.email}</Field>
                <Field label="Rol">
                  <StatusBadge label={active.role} tone={ROLE_TONE[active.role] ?? "muted"} />
                </Field>
                <Field label="Durum">
                  <StatusBadge label={STATUS_LABEL[active.status]} tone={STATUS_TONE[active.status]} />
                </Field>
                <Field label="Katıldı"><span className="inline-flex items-center gap-1"><IdentificationCard className="size-3.5 text-muted-foreground" />{detail.joinedAt}</span></Field>
                <Field label="Son aktiflik"><span className="inline-flex items-center gap-1"><Clock className="size-3.5 text-muted-foreground" />{active.lastActive}</span></Field>
                <Field label="Lokasyon"><span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-muted-foreground" />{detail.location}</span></Field>
                <Field label="Son oturum" mono>{detail.lastSeen}</Field>
                <Field label="2FA">
                  <StatusBadge
                    label={detail.mfa ? "açık" : "kapalı"}
                    tone={detail.mfa ? "emerald" : "amber"}
                  />
                </Field>
                <Field label="Atanmış iş"><span className="tabular-nums">{detail.assigned}</span></Field>
                <Field label="Son güncelleyen">{detail.updatedBy}</Field>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detail.teams.length === 0
                  ? <span className="text-xs text-muted-foreground">Henüz ekip yok</span>
                  : detail.teams.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            </div>
          ),
        },
        {
          value: "izinler",
          label: "İzinler",
          content: (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Roller Permissions matrisinde tanımlanır. Aşağıdaki izinler
                <span className="font-medium text-foreground"> {active.role} </span>
                rolünden gelir.
              </p>
              <div className="grid gap-2">
                {ROLE_PERMS[active.role]?.map((p) => (
                  <div key={p.key} className="flex items-center justify-between rounded-lg border bg-card/40 px-3 py-2">
                    <span className="text-sm">{p.label}</span>
                    <StatusBadge label={p.granted ? "izinli" : "kısıtlı"} tone={p.granted ? "emerald" : "muted"} />
                  </div>
                )) ?? <span className="text-xs text-muted-foreground">İzin verisi yok.</span>}
              </div>
              <Link to="/permissions" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ShieldCheck className="size-3.5" /> İzinleri Permissions'ta düzenle
              </Link>
            </div>
          ),
        },
        {
          value: "aktivite",
          label: "Aktivite",
          content: <AuditTimeline events={detail.audit} />,
        },
        {
          value: "json",
          label: "JSON",
          content: (
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed">
              {JSON.stringify({ ...active, detail }, null, 2)}
            </pre>
          ),
        },
      ]
    : [];

  const drawerFooter = active && (
    <div className="flex w-full items-center gap-2 p-3">
      {active.status === "suspended" ? (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setStatusFor(active.id, "active"); setActiveId(null); }}>
          <ArrowCounterClockwise className="size-4" /> Yeniden Etkinleştir
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setStatusFor(active.id, "suspended"); setActiveId(null); }}>
          <Prohibit className="size-4" /> Askıya Al
        </Button>
      )}
      <Button size="sm" className="ml-auto gap-1.5" onClick={() => queuePrompt(`${active.name} (${active.role}) için uygun izin setini değerlendir.`)}>
        <Sparkles className="size-4" /> İzin Öner
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Team & Members"
        description="Üyeler, davetler ve roller. Roller Permissions matrisinde tanımlanır."
        actions={[
          { label: "İzin Öner", icon: Sparkles, onClick: () => queuePrompt("Editor rolü için makul bir izin seti öner.") },
          { label: "Üye Davet Et", icon: UserPlus, variant: "default", onClick: () => setInviteOpen(true) },
        ]}
      />
      <PageBody className="space-y-4">
        {/* ── KPI şeridi ─────────────────────────────────────────── */}
        {loading ? (
          <KpiSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Aktif üye" value={counts.active} delta={8} icon={CheckCircle}
              trend={[18, 19, 19, 20, 21, 21, counts.active]} hint="bu ay"
            />
            <KpiCard
              label="Bekleyen davet" value={counts.invited} delta={counts.invited > 2 ? 50 : -25} invert
              icon={EnvelopeSimple} trend={[1, 2, 2, 3, 2, 3, counts.invited]} hint="açık"
            />
            <KpiCard
              label="Askıda" value={counts.suspended} delta={0} invert
              icon={Prohibit} trend={[2, 2, 1, 1, 2, 2, counts.suspended]} hint="güvenlik"
            />
            <KpiCard
              label="2FA kapsamı" value={`%${mfaPct}`} delta={6}
              icon={ShieldCheck} trend={[55, 58, 60, 62, 64, 66, mfaPct]} hint="hedef %90"
            />
          </div>
        )}

        {/* ── Filtre şeridi ──────────────────────────────────────── */}
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="İsim, e-posta veya rol ara…"
          onExport={exportData}
        >
          <FilterChip active={status === "all"} onClick={() => setStatus("all")} count={members.length}>Tümü</FilterChip>
          <FilterChip active={status === "active"} onClick={() => setStatus("active")} count={counts.active}>Aktif</FilterChip>
          <FilterChip active={status === "invited"} onClick={() => setStatus("invited")} count={counts.invited}>Davetli</FilterChip>
          <FilterChip active={status === "suspended"} onClick={() => setStatus("suspended")} count={counts.suspended}>Askıda</FilterChip>
          <span className="mx-0.5 h-4 w-px bg-border" />
          {ROLE_OPTIONS.map((r) => (
            <FilterChip key={r} active={roleFilter === r} onClick={() => setRoleFilter(roleFilter === r ? null : r)}>{r}</FilterChip>
          ))}
        </FilterBar>

        {/* ── Toplu işlem ────────────────────────────────────────── */}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Select value="" onValueChange={(v) => typeof v === "string" && v && bulkRole(v)}>
            <SelectTrigger className="h-8 w-40"><span className="inline-flex items-center gap-1.5"><PencilSimple className="size-3.5" /><SelectValue placeholder="Rol değiştir…" /></span></SelectTrigger>
            <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => bulkStatus("suspended")}>
            <Prohibit className="size-3.5" /> Askıya al
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => bulkStatus("active")}>
            <ArrowCounterClockwise className="size-3.5" /> Etkinleştir
          </Button>
        </BulkBar>

        {/* ── İçerik ─────────────────────────────────────────────── */}
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : filtered.length === 0 ? (
          hasFilter ? (
            <EmptyState
              variant="search"
              icon={Users}
              title="Eşleşen üye yok"
              description="Arama ya da filtreleri değiştirmeyi dene."
              action={<Button variant="outline" size="sm" onClick={() => { setQuery(""); setStatus("all"); setRoleFilter(null); }}>Filtreleri temizle</Button>}
            />
          ) : (
            <EmptyState
              icon={UsersThree}
              title="Henüz üye yok"
              description="İlk ekip üyenizi davet ederek başlayın."
              action={<Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}><UserPlus className="size-4" /> Üye Davet Et</Button>}
            />
          )
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-10 px-3 py-2.5">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label="Tümünü seç" />
                  </th>
                  <th className="px-4 py-2.5 font-medium">Üye</th>
                  <th className="px-4 py-2.5 font-medium">Rol</th>
                  <th className="px-4 py-2.5 font-medium">Durum</th>
                  <th className="px-4 py-2.5 font-medium">2FA</th>
                  <th className="px-4 py-2.5 font-medium text-right">Son aktiflik</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const d = detailFor(m.id);
                  const isSel = selected.has(m.id);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setActiveId(m.id)}
                      className={`cursor-pointer border-b last:border-0 transition-colors hover:bg-accent/30 ${isSel ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSel} onCheckedChange={() => toggleRow(m.id)} aria-label={`${m.name} seç`} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar m={m} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{m.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Select value={m.role} onValueChange={(v) => v && setRoleFor(m.id, v)}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge label={STATUS_LABEL[m.status]} tone={STATUS_TONE[m.status]} /></td>
                      <td className="px-4 py-2.5">
                        {d.mfa
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><Fingerprint className="size-3.5" />açık</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Fingerprint className="size-3.5" />kapalı</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{m.lastActive}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} / {members.length} üye gösteriliyor</span>
            <Link to="/permissions" className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <ShieldCheck className="size-3.5" /> Rol izinlerini Permissions'ta düzenle
            </Link>
          </div>
        )}
      </PageBody>

      {/* ── Detay paneli ─────────────────────────────────────────── */}
      <DetailDrawer
        open={!!active}
        onOpenChange={(v) => !v && setActiveId(null)}
        title={active?.name ?? ""}
        subtitle={active?.email}
        badge={active && <StatusBadge label={STATUS_LABEL[active.status]} tone={STATUS_TONE[active.status]} />}
        tabs={tabs}
        footer={drawerFooter}
      />

      {/* ── Davet diyaloğu ───────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
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
            <p className="text-[11px] text-muted-foreground">
              Davetli kişi bağlantıyı kabul edene kadar <span className="font-medium">davetli</span> durumunda kalır.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>İptal</Button>
            <Button onClick={invite} className="gap-1.5"><UserPlus className="size-4" /> Davet Gönder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Rol bazlı izin özeti (Permissions matrisinin okunabilir özeti).
const ROLE_PERMS: Record<string, { key: string; label: string; granted: boolean }[]> = {
  Admin: [
    { key: "manage_team", label: "Ekip ve rolleri yönet", granted: true },
    { key: "deploy", label: "Production'a deploy", granted: true },
    { key: "billing", label: "Faturalama ve plan", granted: true },
    { key: "api_keys", label: "API anahtarı yönetimi", granted: true },
  ],
  Developer: [
    { key: "deploy", label: "Staging'e deploy", granted: true },
    { key: "migrations", label: "Migration çalıştır", granted: true },
    { key: "billing", label: "Faturalama ve plan", granted: false },
    { key: "manage_team", label: "Ekip ve rolleri yönet", granted: false },
  ],
  Editor: [
    { key: "content", label: "İçerik yayınla / düzenle", granted: true },
    { key: "media", label: "Medya kütüphanesi", granted: true },
    { key: "deploy", label: "Deploy", granted: false },
    { key: "api_keys", label: "API anahtarı yönetimi", granted: false },
  ],
  Viewer: [
    { key: "read", label: "Panelleri görüntüle", granted: true },
    { key: "content", label: "İçerik düzenle", granted: false },
    { key: "deploy", label: "Deploy", granted: false },
    { key: "manage_team", label: "Ekip yönet", granted: false },
  ],
};
