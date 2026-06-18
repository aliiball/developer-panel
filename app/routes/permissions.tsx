import { useMemo, useState } from "react";
import {
  Sparkle as Sparkles,
  Plus,
  ShieldCheck,
  Lock,
  Users,
  Key,
  Warning,
  FloppyDisk,
  ArrowCounterClockwise,
  Trash,
  CheckCircle,
  PencilSimple,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import {
  EmptyState,
  KpiCard,
  KpiSkeleton,
  FilterBar,
  FilterChip,
  BulkBar,
  DetailDrawer,
  Field,
  AuditTimeline,
  type DrawerTab,
} from "~/components/enterprise";
import {
  SEED_ROLES,
  PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
  type Role,
} from "~/data/permissions";
import {
  RESOURCE_META,
  ACTION_META,
  ROLE_META,
  DEFAULT_ROLE_META,
  SEED_AUDIT,
  roleAudit,
  type RoleMeta,
} from "~/data/seed.permissions";
import { getMockAIResponse } from "~/lib/ai-mock";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { toast } from "sonner";
import { toastUndo } from "~/lib/feedback";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Permissions — MetaPanel" }];
}

const RISK_TONE: Record<"low" | "medium" | "high", string> = {
  low: "text-muted-foreground",
  medium: "text-amber-400",
  high: "text-red-400",
};

function permCount(r: Role) {
  return ALL_PERMISSION_KEYS.filter((k) => r.permissions[k]).length;
}

export default function Permissions() {
  const [roles, setRoles] = useState<Role[]>(SEED_ROLES);
  const [meta, setMeta] = useState<Record<string, RoleMeta>>(ROLE_META);
  const [baseline, setBaseline] = useState<Role[]>(SEED_ROLES);
  const [audit, setAudit] = useState(SEED_AUDIT);

  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high">("all");
  const [showSystem, setShowSystem] = useState(true);
  const [hideUnused, setHideUnused] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerRole, setDrawerRole] = useState<Role | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);

  const [busySave, setBusySave] = useState(false);

  // ── türetilmiş veri ───────────────────────────────────────────────
  const visibleRoles = useMemo(
    () => roles.filter((r) => (showSystem ? true : !r.system)),
    [roles, showSystem],
  );

  const dirty = useMemo(() => {
    if (roles.length !== baseline.length) return true;
    return roles.some((r) => {
      const b = baseline.find((x) => x.id === r.id);
      if (!b) return true;
      return ALL_PERMISSION_KEYS.some((k) => !!r.permissions[k] !== !!b.permissions[k]);
    });
  }, [roles, baseline]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const r of roles) {
      const b = baseline.find((x) => x.id === r.id);
      for (const k of ALL_PERMISSION_KEYS) {
        if (!b || !!r.permissions[k] !== !!b.permissions[k]) n++;
      }
    }
    return n;
  }, [roles, baseline]);

  // izin satırlarını arama + risk filtresine göre süz
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PERMISSION_GROUPS.map((group) => {
      const actions = group.actions.filter((action) => {
        const key = `${group.resource}.${action}`;
        const am = ACTION_META[action];
        if (riskFilter === "high" && am?.risk !== "high") return false;
        if (hideUnused && !visibleRoles.some((r) => r.permissions[key])) return false;
        if (!q) return true;
        const label = `${RESOURCE_META[group.resource]?.label ?? ""} ${am?.label ?? ""} ${key}`.toLowerCase();
        return label.includes(q);
      });
      return { ...group, actions };
    }).filter((g) => g.actions.length > 0);
  }, [query, riskFilter, hideUnused, visibleRoles]);

  const totalShown = filteredGroups.reduce((a, g) => a + g.actions.length, 0);
  const noResults = totalShown === 0;

  // ── KPI'lar ───────────────────────────────────────────────────────
  const totalUsers = Object.values(meta).reduce((a, m) => a + (m?.users ?? 0), 0);
  const highRiskGrants = roles.reduce((acc, r) => {
    return (
      acc +
      ALL_PERMISSION_KEYS.filter((k) => {
        const action = k.split(".")[1];
        return r.permissions[k] && ACTION_META[action]?.risk === "high";
      }).length
    );
  }, 0);

  // ── eylemler ──────────────────────────────────────────────────────
  function pushAudit(action: string, detail?: string, tone: "emerald" | "amber" | "primary" | "default" = "default") {
    setAudit((prev) => [
      {
        id: `a-${Date.now()}`,
        actor: "turksab.yonetim@gmail.com",
        action,
        at: "az önce",
        icon: PencilSimple,
        tone,
        detail,
      },
      ...prev,
    ]);
  }

  function toggle(roleId: string, key: string) {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId && !r.system
          ? { ...r, permissions: { ...r.permissions, [key]: !r.permissions[key] } }
          : r,
      ),
    );
  }

  function toggleColumnAll(role: Role, on: boolean) {
    if (role.system) return;
    const before = { ...role.permissions };
    setRoles((prev) =>
      prev.map((r) =>
        r.id === role.id
          ? { ...r, permissions: Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, on])) }
          : r,
      ),
    );
    toastUndo(on ? "Tüm izinler verildi" : "Tüm izinler kaldırıldı", {
      description: role.name,
      onUndo: () =>
        setRoles((prev) =>
          prev.map((r) => (r.id === role.id ? { ...r, permissions: before } : r)),
        ),
    });
  }

  function createRole() {
    const name = newRoleName.trim() || `Rol ${roles.length + 1}`;
    const id = `role_${Date.now()}`;
    setRoles((prev) => [
      ...prev,
      { id, name, description: newRoleDesc.trim() || "Yeni özel rol", permissions: {} },
    ]);
    setMeta((prev) => ({ ...prev, [id]: { ...DEFAULT_ROLE_META } }));
    pushAudit(`${name} rolü oluşturuldu`, undefined, "primary");
    toast.success("Rol eklendi", {
      description: name,
      action: {
        label: "Geri al",
        onClick: () => setRoles((prev) => prev.filter((r) => r.id !== id)),
      },
    });
    setAddOpen(false);
    setNewRoleName("");
    setNewRoleDesc("");
  }

  function aiSuggest() {
    const res = getMockAIResponse("editor rolü için izin öner");
    if (res.preview?.kind === "permissions") {
      const pv = res.preview;
      const perms = pv.permissions;
      const target = roles.find((r) => r.name.toLowerCase() === pv.roleName.toLowerCase() && !r.system);
      if (!target) {
        toast.error("Hedef rol bulunamadı", { description: `${pv.roleName} (düzenlenebilir) yok` });
        return;
      }
      const before = { ...target.permissions };
      setRoles((prev) =>
        prev.map((r) =>
          r.id === target.id
            ? { ...r, permissions: Object.fromEntries(perms.map((p) => [p, true])) }
            : r,
        ),
      );
      pushAudit(`AI önerilen izin seti uygulandı → ${target.name}`, `${perms.length} izin`, "primary");
      toast.success("AI izin önerisi uygulandı", {
        description: `${target.name} → ${perms.length} izin`,
        action: {
          label: "Geri al",
          onClick: () =>
            setRoles((prev) =>
              prev.map((r) => (r.id === target.id ? { ...r, permissions: before } : r)),
            ),
        },
      });
    }
  }

  function saveChanges() {
    if (busySave) return;
    const approved = dirtyCount;
    setBusySave(true);
    setTimeout(() => {
      setBaseline(roles.map((r) => ({ ...r, permissions: { ...r.permissions } })));
      pushAudit(`Matris değişiklikleri kaydedildi`, `${approved} değişiklik onaylandı`, "emerald");
      setBusySave(false);
      toast.success("Değişiklikler kaydedildi", { description: `${approved} izin değişikliği onaylandı` });
    }, 600);
  }

  function resetChanges() {
    const draft = roles.map((r) => ({ ...r, permissions: { ...r.permissions } }));
    const reverted = dirtyCount;
    setRoles(baseline.map((r) => ({ ...r, permissions: { ...r.permissions } })));
    setConfirmReset(false);
    toastUndo("Değişiklikler geri alındı", {
      description: `${reverted} taslak değişiklik son kayda döndürüldü`,
      undoLabel: "Taslağı geri yükle",
      onUndo: () => setRoles(draft),
    });
  }

  function deleteRole(role: Role) {
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(role.id);
      return next;
    });
    pushAudit(`${role.name} rolü silindi`, undefined, "amber");
    toast.success("Rol silindi", { description: role.name });
    setConfirmDelete(null);
    if (drawerRole?.id === role.id) setDrawerRole(null);
  }

  function bulkDelete() {
    const ids = [...selected];
    const deletable = roles.filter((r) => ids.includes(r.id) && !r.system);
    setRoles((prev) => prev.filter((r) => !deletable.some((d) => d.id === r.id)));
    pushAudit(`${deletable.length} rol toplu silindi`, deletable.map((r) => r.name).join(", "), "amber");
    toast.success(`${deletable.length} rol silindi`);
    setSelected(new Set());
  }

  function exportMatrix() {
    const json = JSON.stringify(
      roles.map((r) => ({ role: r.name, permissions: Object.keys(r.permissions).filter((k) => r.permissions[k]) })),
      null,
      2,
    );
    toast.success("Matris export edildi", { description: `${json.length} bayt JSON kopyalandı` });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedDeletable = [...selected].filter((id) => !roles.find((r) => r.id === id)?.system).length;

  // ── render ────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Permissions"
        description="Rol × izin matrisi. Sistem rolleri kilitlidir; değişiklikler kaydedilene kadar taslaktır."
        actions={[
          { label: "Yeni Rol", icon: Plus, onClick: () => setAddOpen(true) },
          { label: "AI Öner", icon: Sparkles, variant: "default", onClick: aiSuggest },
        ]}
      />
      <PageBody>
        <div className="space-y-4">
          {/* KPI şeridi */}
          {roles.length === 0 ? (
            <KpiSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="Tanımlı Rol"
                value={roles.length}
                delta={roles.length > baseline.length ? 100 : 0}
                icon={ShieldCheck}
                hint={`${roles.filter((r) => r.system).length} sistem`}
                trend={[4, 4, 4, 5, 5, 5, 6, roles.length]}
              />
              <KpiCard
                label="Atanmış Kullanıcı"
                value={totalUsers}
                delta={6}
                icon={Users}
                trend={[70, 74, 79, 82, 88, 90, 93, totalUsers]}
              />
              <KpiCard
                label="Toplam İzin Anahtarı"
                value={ALL_PERMISSION_KEYS.length}
                icon={Key}
                hint={`${PERMISSION_GROUPS.length} kategori`}
                trend={[14, 15, 16, 16, 17, 17, 17, ALL_PERMISSION_KEYS.length]}
              />
              <KpiCard
                label="Yüksek-Risk İzni"
                value={highRiskGrants}
                delta={dirty ? 4 : 0}
                invert
                icon={Warning}
                hint="silme / kurulum / export"
                trend={[8, 9, 9, 10, 10, 11, 11, highRiskGrants]}
              />
            </div>
          )}

          {/* Taslak değişiklik şeridi */}
          {dirty && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-amber-400">
                <PencilSimple className="size-4" weight="bold" />
                {dirtyCount} kaydedilmemiş değişiklik
              </span>
              <span className="text-xs text-muted-foreground">Onaylanana kadar etkin değildir.</span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={busySave}
                  onClick={() => setConfirmReset(true)}
                >
                  <ArrowCounterClockwise className="size-3.5" /> Geri Al
                </Button>
                <Button size="sm" className="gap-1.5" loading={busySave} onClick={saveChanges}>
                  <FloppyDisk className="size-3.5" /> Kaydet & Onayla
                </Button>
              </div>
            </div>
          )}

          {/* Filtre şeridi */}
          <FilterBar
            search={query}
            onSearch={setQuery}
            placeholder="İzin / kategori ara… (ör. silme, data, settings)"
            onExport={exportMatrix}
          >
            <FilterChip active={riskFilter === "all"} onClick={() => setRiskFilter("all")}>
              Tüm izinler
            </FilterChip>
            <FilterChip
              active={riskFilter === "high"}
              onClick={() => setRiskFilter("high")}
              count={ALL_PERMISSION_KEYS.filter((k) => ACTION_META[k.split(".")[1]]?.risk === "high").length}
            >
              Yalnız yüksek-risk
            </FilterChip>
            <FilterChip active={hideUnused} onClick={() => setHideUnused((v) => !v)}>
              Kullanılmayanı gizle
            </FilterChip>
            <FilterChip active={!showSystem} onClick={() => setShowSystem((v) => !v)}>
              Sistem rollerini gizle
            </FilterChip>
          </FilterBar>

          {/* Toplu işlem şeridi */}
          <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={selectedDeletable === 0}
              onClick={bulkDelete}
            >
              <Trash className="size-3.5" /> Sil ({selectedDeletable})
            </Button>
            <span className="text-xs text-muted-foreground">
              {selected.size - selectedDeletable > 0 &&
                `${selected.size - selectedDeletable} sistem rolü atlanır`}
            </span>
          </BulkBar>

          {/* Matris */}
          {visibleRoles.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Görüntülenecek rol yok"
              description="Sistem rolleri gizli. Yeni bir özel rol oluşturun ya da sistem rollerini gösterin."
              action={
                <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" /> Yeni Rol
                </Button>
              }
            />
          ) : noResults ? (
            <EmptyState
              icon={Key}
              variant="search"
              title="Eşleşen izin yok"
              description="Arama veya risk filtresini gevşetin."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setRiskFilter("all");
                    setHideUnused(false);
                  }}
                >
                  Filtreleri temizle
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      İzin
                    </th>
                    {visibleRoles.map((r) => {
                      const cnt = permCount(r);
                      const total = ALL_PERMISSION_KEYS.length;
                      const all = cnt === total;
                      return (
                        <th key={r.id} className="min-w-[120px] px-3 py-3 align-top">
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              onClick={() => setDrawerRole(r)}
                              className="flex items-center gap-1 font-medium hover:text-primary"
                            >
                              {r.system && <Lock className="size-3 text-muted-foreground" />}
                              {r.name}
                            </button>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              {meta[r.id]?.users ?? 0} kullanıcı · {cnt}/{total}
                            </span>
                            <div className="flex items-center gap-1">
                              {!r.system && (
                                <Checkbox
                                  aria-label={`${r.name} seç`}
                                  checked={selected.has(r.id)}
                                  onCheckedChange={() => toggleSelect(r.id)}
                                />
                              )}
                              {!r.system && (
                                <Checkbox
                                  aria-label={`${r.name} tümünü değiştir`}
                                  checked={all}
                                  indeterminate={!all && cnt > 0}
                                  onCheckedChange={() => toggleColumnAll(r, !all)}
                                />
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => (
                    <RoleGroup
                      key={group.resource}
                      group={group}
                      roles={visibleRoles}
                      onToggle={toggle}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rol özet rozetleri */}
          <div className="flex flex-wrap gap-2">
            {visibleRoles.map((r) => {
              const count = permCount(r);
              return (
                <button key={r.id} onClick={() => setDrawerRole(r)}>
                  <Badge variant="secondary" className="gap-1.5">
                    {r.system ? <Lock className="size-3" /> : <ShieldCheck className="size-3" />}
                    {r.name}: {count} izin
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rol detay drawer'ı */}
        <RoleDrawer
          role={drawerRole}
          meta={drawerRole ? meta[drawerRole.id] : undefined}
          onOpenChange={(v) => !v && setDrawerRole(null)}
          onDelete={(r) => setConfirmDelete(r)}
          onAiSuggest={() => {
            aiSuggest();
            setDrawerRole(null);
          }}
        />

        {/* Yeni rol diyalogu */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Rol</DialogTitle>
              <DialogDescription>
                Özel bir rol oluşturun. İzinler boş başlar; matrise işaretleyerek atayın.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Rol adı</label>
                <Input
                  autoFocus
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="ör. Reviewer"
                  onKeyDown={(e) => e.key === "Enter" && createRole()}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Açıklama</label>
                <Input
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Bu rol ne yapabilir?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
                Vazgeç
              </Button>
              <Button size="sm" className="gap-1.5" onClick={createRole}>
                <Plus className="size-3.5" /> Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Geri al onayı */}
        <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Değişiklikleri geri al?</DialogTitle>
              <DialogDescription>
                {dirtyCount} kaydedilmemiş izin değişikliği son kaydedilen duruma döndürülecek.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
                Vazgeç
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={resetChanges}>
                <ArrowCounterClockwise className="size-3.5" /> Geri Al
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rol sil onayı */}
        <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmDelete?.name} rolünü sil?</DialogTitle>
              <DialogDescription>
                Bu rol {confirmDelete ? meta[confirmDelete.id]?.users ?? 0 : 0} kullanıcıya atalı. Silmek geri
                alınamaz; kullanıcıların bu roldeki izinleri kaldırılır.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                Vazgeç
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => confirmDelete && deleteRole(confirmDelete)}
              >
                <Trash className="size-3.5" /> Sil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageBody>
    </>
  );
}

function RoleGroup({
  group,
  roles,
  onToggle,
}: {
  group: { resource: string; actions: string[] };
  roles: Role[];
  onToggle: (roleId: string, key: string) => void;
}) {
  const rm = RESOURCE_META[group.resource];
  return (
    <>
      <tr className="bg-muted/30">
        <td
          colSpan={roles.length + 1}
          className="px-4 py-1.5 text-left"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
            {rm?.label ?? group.resource}
          </span>
          {rm?.description && (
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">{rm.description}</span>
          )}
        </td>
      </tr>
      {group.actions.map((action) => {
        const key = `${group.resource}.${action}`;
        const am = ACTION_META[action];
        return (
          <tr key={key} className="border-b last:border-0 hover:bg-accent/30">
            <td className="sticky left-0 z-10 bg-card px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{key}</span>
                {am && (
                  <span className={cn("text-[10px] font-medium", RISK_TONE[am.risk])}>{am.label}</span>
                )}
              </div>
            </td>
            {roles.map((r) => (
              <td key={r.id} className="px-3 py-2 text-center">
                <div className={cn("flex justify-center", r.system && "opacity-60")}>
                  <Checkbox
                    aria-label={`${r.name} · ${key}`}
                    checked={!!r.permissions[key]}
                    disabled={r.system}
                    onCheckedChange={() => onToggle(r.id, key)}
                  />
                </div>
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

function RoleDrawer({
  role,
  meta,
  onOpenChange,
  onDelete,
  onAiSuggest,
}: {
  role: Role | null;
  meta?: RoleMeta;
  onOpenChange: (v: boolean) => void;
  onDelete: (r: Role) => void;
  onAiSuggest: () => void;
}) {
  if (!role) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} title="" />;
  }

  const granted = ALL_PERMISSION_KEYS.filter((k) => role.permissions[k]);
  const grantedByGroup = PERMISSION_GROUPS.map((g) => ({
    resource: g.resource,
    label: RESOURCE_META[g.resource]?.label ?? g.resource,
    keys: g.actions.map((a) => `${g.resource}.${a}`).filter((k) => role.permissions[k]),
  })).filter((g) => g.keys.length > 0);

  const tabs: DrawerTab[] = [
    {
      value: "genel",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card/50">
            <div className="px-3">
              <Field label="Rol ID" mono>{role.id}</Field>
              <Field label="Tip">
                {role.system ? (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3" /> Sistem (kilitli)
                  </Badge>
                ) : (
                  <Badge variant="secondary">Özel</Badge>
                )}
              </Field>
              <Field label="Atanmış kullanıcı">{meta?.users ?? 0}</Field>
              <Field label="İzin sayısı">
                {granted.length} / {ALL_PERMISSION_KEYS.length}
              </Field>
              <Field label="Son güncelleyen">{meta?.updatedBy ?? "—"}</Field>
              <Field label="Son güncelleme" mono>{meta?.updatedAt ?? "—"}</Field>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle className="size-3.5" /> Verilen izinler ({granted.length})
            </p>
            {grantedByGroup.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                Bu role henüz izin verilmedi.
              </p>
            ) : (
              <div className="space-y-2.5">
                {grantedByGroup.map((g) => (
                  <div key={g.resource}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.keys.map((k) => {
                        const action = k.split(".")[1];
                        const risk = ACTION_META[action]?.risk ?? "low";
                        return (
                          <Badge
                            key={k}
                            variant={risk === "high" ? "destructive" : "secondary"}
                            className="font-mono text-[10px]"
                          >
                            {k}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "aktivite",
      label: "Aktivite",
      content: <AuditTimeline events={roleAudit(role.name, role.system)} />,
    },
    {
      value: "json",
      label: "JSON",
      content: (
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(
            {
              id: role.id,
              name: role.name,
              description: role.description,
              system: !!role.system,
              users: meta?.users ?? 0,
              permissions: granted,
            },
            null,
            2,
          )}
        </pre>
      ),
    },
  ];

  return (
    <DetailDrawer
      open={!!role}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-1.5">
          {role.system ? <Lock className="size-4" /> : <ShieldCheck className="size-4" />}
          {role.name}
        </span>
      }
      subtitle={role.description}
      badge={
        <Badge variant={role.system ? "outline" : "secondary"}>
          {granted.length} izin
        </Badge>
      }
      tabs={tabs}
      footer={
        <div className="flex w-full items-center gap-2 p-3">
          {!role.system ? (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onAiSuggest}>
                <Sparkles className="size-3.5" /> AI Öner
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto gap-1.5"
                onClick={() => onDelete(role)}
              >
                <Trash className="size-3.5" /> Rolü Sil
              </Button>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Sistem rolü düzenlenemez.
            </span>
          )}
        </div>
      }
    />
  );
}
