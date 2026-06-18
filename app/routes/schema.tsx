import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Sparkle as Sparkles,
  Database,
  Link as Link2,
  Clock,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { DataTable } from "~/components/ui/data-table";
import { useSchemaStore, type SchemaModel } from "~/stores/schema-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Schema — MetaPanel" }];
}

const columns: ColumnDef<SchemaModel, unknown>[] = [
  {
    accessorKey: "name",
    header: "Model",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Database className="size-4 text-muted-foreground" />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "tableName",
    header: "Tablo",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">{getValue() as string}</span>
    ),
  },
  {
    id: "fields",
    header: "Alan",
    accessorFn: (m) => m.fields.length,
    cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span>,
  },
  {
    id: "relations",
    header: "İlişki",
    accessorFn: (m) => m.fields.filter((f) => f.type === "relation").length,
    cell: ({ getValue }) => {
      const n = getValue() as number;
      return n ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="size-3" /> {n}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "flags",
    header: "Özellik",
    cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.timestamps && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Clock className="size-2.5" /> timestamps
          </Badge>
        )}
        {row.original.softDelete && (
          <Badge variant="secondary" className="text-[10px]">soft-delete</Badge>
        )}
      </div>
    ),
  },
];

export default function Schema() {
  const navigate = useNavigate();
  const models = useSchemaStore((s) => s.models);
  const addModel = useSchemaStore((s) => s.addModel);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  // ?new=1 from Spotlight / Dashboard opens the create dialog.
  useEffect(() => {
    if (params.get("new") === "1") {
      setOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  function create() {
    if (!name.trim()) return;
    const id = addModel({ name: name.trim() });
    toast.success("Model oluşturuldu", { description: name });
    setName("");
    setOpen(false);
    navigate(`/schema/${id}`);
  }

  return (
    <>
      <PageHeader
        title="Schema"
        description="Veri modelleri ve alan tanımları. Bir modele tıklayıp alan editörünü açın."
        actions={[
          { label: "Yeni Model", icon: Plus, variant: "default", onClick: () => setOpen(true) },
          { label: "AI ile Oluştur", icon: Sparkles, onClick: () => queuePrompt("E-ticaret şeması üret: Product, Order, OrderItem ve Category.") },
        ]}
      />
      <PageBody>
        <DataTable
          columns={columns}
          data={models}
          searchPlaceholder="Model ara…"
          onRowClick={(m) => navigate(`/schema/${m.id}`)}
        />
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="model-name">Model adı</Label>
            <Input
              id="model-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="örn. Subscription"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Tablo adı otomatik türetilir (snake_case, çoğul).
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={create}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
