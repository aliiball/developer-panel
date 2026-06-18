import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  UploadSimple as Upload,
  Download,
  Pencil,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { DataTable } from "~/components/ui/data-table";
import { useSchemaStore, type SchemaModel } from "~/stores/schema-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Data — MetaPanel" }];
}

type Row = Record<string, string | number | boolean>;

// Deterministic-ish mock value per field type (index-seeded, no Math.random
// in render path so rows are stable across re-renders).
function mockValue(type: string, i: number, name: string): string | number | boolean {
  switch (type) {
    case "number": return (i + 1) * 7 + (name.includes("price") ? 0.99 : 0);
    case "boolean": return i % 2 === 0;
    case "email": return `user${i + 1}@mail.com`;
    case "url": return `https://example.com/${i + 1}`;
    case "date": return `2026-0${(i % 9) + 1}-1${i % 9}`;
    case "enum": return ["pending", "paid", "shipped"][i % 3];
    case "relation": return `#${100 + i}`;
    default: return `${name}-${i + 1}`;
  }
}

function buildRows(model: SchemaModel, count = 12): Row[] {
  return Array.from({ length: count }, (_, i) => {
    const row: Row = { id: i + 1 };
    for (const f of model.fields) row[f.name] = mockValue(f.type, i, f.name);
    return row;
  });
}

export default function Data() {
  const models = useSchemaStore((s) => s.models);
  const [modelId, setModelId] = useState(models[0]?.id);
  const model = models.find((m) => m.id === modelId) ?? models[0];

  const rows = useMemo(() => (model ? buildRows(model) : []), [model]);

  const columns = useMemo<ColumnDef<Row, unknown>[]>(() => {
    if (!model) return [];
    return [
      { accessorKey: "id", header: "ID", cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue() as number}</span> },
      ...model.fields.slice(0, 5).map((f) => ({
        accessorKey: f.name,
        header: f.name,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const v = getValue();
          if (typeof v === "boolean") return <Badge variant={v ? "default" : "secondary"} className="text-[10px]">{String(v)}</Badge>;
          return <span className="text-sm">{String(v)}</span>;
        },
      })),
      {
        id: "actions",
        header: "",
        cell: () => (
          <button className="text-muted-foreground hover:text-foreground" onClick={() => toast.info("Inline düzenleme (mock)")}>
            <Pencil className="size-3.5" />
          </button>
        ),
      },
    ] as ColumnDef<Row, unknown>[];
  }, [model]);

  return (
    <>
      <PageHeader
        title="Data Manager"
        description="Model kayıtlarını görüntüle ve yönet (mock veri)."
        actions={[
          { label: "Yeni Kayıt", icon: Plus, variant: "default", onClick: () => toast.success("Yeni kayıt formu (mock)") },
          { label: "Import", icon: Upload, onClick: () => toast.info("CSV import (mock)") },
          { label: "Export", icon: Download, onClick: () => toast.success("CSV export (mock)") },
        ]}
      >
        <Select value={modelId} onValueChange={(v) => v && setModelId(v)}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>
      <PageBody>
        <DataTable columns={columns} data={rows} searchPlaceholder={`${model?.name} ara…`} />
      </PageBody>
    </>
  );
}
