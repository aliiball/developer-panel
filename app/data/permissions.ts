export interface Role {
  id: string;
  name: string;
  description: string;
  system?: boolean;
  permissions: Record<string, boolean>;
}

// permission keys: <resource>.<action>
export const PERMISSION_GROUPS: { resource: string; actions: string[] }[] = [
  { resource: "models", actions: ["read", "create", "update", "delete"] },
  { resource: "modules", actions: ["read", "toggle", "install"] },
  { resource: "data", actions: ["read", "write", "export"] },
  { resource: "theme", actions: ["read", "edit"] },
  { resource: "settings", actions: ["read", "manage"] },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
  g.actions.map((a) => `${g.resource}.${a}`),
);

function fill(keys: string[]): Record<string, boolean> {
  return Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, keys.includes(k)]));
}

export const SEED_ROLES: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Tam yetki.",
    system: true,
    permissions: fill(ALL_PERMISSION_KEYS),
  },
  {
    id: "developer",
    name: "Developer",
    description: "Şema ve modül geliştirme.",
    permissions: fill([
      "models.read", "models.create", "models.update",
      "modules.read", "modules.toggle",
      "data.read", "data.write", "data.export",
      "theme.read", "theme.edit",
      "settings.read",
    ]),
  },
  {
    id: "editor",
    name: "Editor",
    description: "İçerik ve veri düzenleme.",
    permissions: fill([
      "models.read",
      "modules.read",
      "data.read", "data.write",
      "theme.read",
      "settings.read",
    ]),
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Salt okunur erişim.",
    permissions: fill([
      "models.read", "modules.read", "data.read", "theme.read", "settings.read",
    ]),
  },
];
