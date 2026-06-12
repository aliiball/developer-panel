import type { SchemaModel, FieldType } from "~/stores/schema-store";
import type { BrandColors } from "~/stores/theme-store";

// ── Schema → JSON (the live preview on the field editor) ──────────
export function modelToJson(model: SchemaModel): string {
  return JSON.stringify(
    {
      name: model.name,
      table: model.tableName,
      timestamps: model.timestamps,
      softDelete: model.softDelete,
      fields: model.fields.map((f) => ({
        name: f.name,
        type: f.type,
        ...(f.required ? { required: true } : {}),
        ...(f.unique ? { unique: true } : {}),
        ...(f.indexed ? { indexed: true } : {}),
        ...(f.defaultValue ? { default: f.defaultValue } : {}),
        ...(f.enumValues ? { enum: f.enumValues } : {}),
        ...(f.relationModel ? { relation: f.relationModel } : {}),
        ...(f.validation ? { validation: f.validation } : {}),
      })),
    },
    null,
    2,
  );
}

const TS_TYPES: Record<FieldType, string> = {
  string: "string",
  text: "string",
  email: "string",
  url: "string",
  number: "number",
  boolean: "boolean",
  date: "Date",
  json: "Record<string, unknown>",
  relation: "number",
  enum: "string",
  computed: "string",
};

// ── Schema → TypeScript interface ─────────────────────────────────
export function modelToTs(model: SchemaModel): string {
  const lines = [`export interface ${model.name} {`, `  id: number;`];
  for (const field of model.fields) {
    const t =
      field.type === "enum" && field.enumValues?.length
        ? field.enumValues.map((v) => `"${v}"`).join(" | ")
        : TS_TYPES[field.type];
    lines.push(`  ${field.name}${field.required ? "" : "?"}: ${t};`);
  }
  if (model.timestamps) {
    lines.push("  createdAt: Date;", "  updatedAt: Date;");
  }
  lines.push("}");
  return lines.join("\n");
}

const SQL_TYPES: Record<FieldType, string> = {
  string: "varchar(255)",
  text: "text",
  email: "varchar(255)",
  url: "varchar(2048)",
  number: "numeric",
  boolean: "boolean",
  date: "timestamptz",
  json: "jsonb",
  relation: "integer",
  enum: "varchar(64)",
  computed: "varchar(255)",
};

// ── Schema → SQL migration ────────────────────────────────────────
export function modelToSql(model: SchemaModel): string {
  const cols = ["  id serial PRIMARY KEY"];
  for (const field of model.fields) {
    let col = `  ${snake(field.name)} ${SQL_TYPES[field.type]}`;
    if (field.required) col += " NOT NULL";
    if (field.unique) col += " UNIQUE";
    if (field.defaultValue) col += ` DEFAULT '${field.defaultValue}'`;
    cols.push(col);
  }
  if (model.timestamps) {
    cols.push("  created_at timestamptz DEFAULT now()");
    cols.push("  updated_at timestamptz DEFAULT now()");
  }
  const indexes = model.fields
    .filter((field) => field.indexed && !field.unique)
    .map(
      (field) =>
        `CREATE INDEX ${model.tableName}_${snake(field.name)}_idx ON ${model.tableName} (${snake(
          field.name,
        )});`,
    );
  return (
    `CREATE TABLE ${model.tableName} (\n${cols.join(",\n")}\n);` +
    (indexes.length ? "\n\n" + indexes.join("\n") : "")
  );
}

function snake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

// ── Theme token export ────────────────────────────────────────────
export function brandToCssVars(brand: BrandColors): string {
  return (
    ":root {\n" +
    Object.entries(brand)
      .map(([k, v]) => `  --brand-${k}: ${v};`)
      .join("\n") +
    "\n}"
  );
}

export function brandToTailwind(brand: BrandColors): string {
  return (
    "// tailwind.config — theme.extend.colors\n" +
    "export const brand = " +
    JSON.stringify(brand, null, 2) +
    ";"
  );
}

export function brandToTokensJson(brand: BrandColors): string {
  return JSON.stringify(
    {
      color: Object.fromEntries(
        Object.entries(brand).map(([k, v]) => [k, { value: v, type: "color" }]),
      ),
    },
    null,
    2,
  );
}
