import { useState } from "react";
import { Sparkles, Plus, ShieldCheck, Lock } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import {
  SEED_ROLES,
  PERMISSION_GROUPS,
  type Role,
} from "~/data/permissions";
import { getMockAIResponse } from "~/lib/ai-mock";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Permissions — MetaPanel" }];
}

export default function Permissions() {
  const [roles, setRoles] = useState<Role[]>(SEED_ROLES);

  function toggle(roleId: string, key: string) {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId && !r.system
          ? { ...r, permissions: { ...r.permissions, [key]: !r.permissions[key] } }
          : r,
      ),
    );
  }

  function addRole() {
    const name = `Role ${roles.length + 1}`;
    setRoles((prev) => [
      ...prev,
      { id: `role_${prev.length}`, name, description: "Yeni rol", permissions: {} },
    ]);
    toast.success("Rol eklendi", { description: name });
  }

  function aiSuggest() {
    const res = getMockAIResponse("editor rolü için izin öner");
    if (res.preview?.kind === "permissions") {
      const pv = res.preview;
      const perms = pv.permissions;
      const target = roles.find((r) => r.name.toLowerCase() === pv.roleName.toLowerCase());
      if (target) {
        setRoles((prev) =>
          prev.map((r) =>
            r.id === target.id
              ? { ...r, permissions: Object.fromEntries(perms.map((p) => [p, true])) }
              : r,
          ),
        );
        toast.success("AI izin önerisi uygulandı", {
          description: `${target.name} → ${perms.length} izin`,
        });
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Permissions"
        description="Rol × izin matrisi. Sistem rolleri kilitlidir."
        actions={[
          { label: "Yeni Rol", icon: Plus, onClick: addRole },
          { label: "AI Öner", icon: Sparkles, variant: "default", onClick: aiSuggest },
        ]}
      />
      <PageBody>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  İzin
                </th>
                {roles.map((r) => (
                  <th key={r.id} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="flex items-center gap-1 font-medium">
                        {r.system && <Lock className="size-3 text-muted-foreground" />}
                        {r.name}
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground">{r.description}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <RoleGroup key={group.resource} group={group} roles={roles} onToggle={toggle} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {roles.map((r) => {
            const count = Object.values(r.permissions).filter(Boolean).length;
            return (
              <Badge key={r.id} variant="secondary" className="gap-1.5">
                <ShieldCheck className="size-3" /> {r.name}: {count} izin
              </Badge>
            );
          })}
        </div>
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
  return (
    <>
      <tr className="bg-muted/30">
        <td colSpan={roles.length + 1} className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {group.resource}
        </td>
      </tr>
      {group.actions.map((action) => {
        const key = `${group.resource}.${action}`;
        return (
          <tr key={key} className="border-b last:border-0 hover:bg-accent/30">
            <td className="sticky left-0 z-10 bg-card px-4 py-2 font-mono text-xs">{key}</td>
            {roles.map((r) => (
              <td key={r.id} className="px-4 py-2 text-center">
                <div className={cn("flex justify-center", r.system && "opacity-60")}>
                  <Checkbox
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
