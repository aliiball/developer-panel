import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  ArrowLeft,
  Plus,
  Sparkle as Sparkles,
  MagicWand as Wand2,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { FieldEditorRow } from "~/components/schema/FieldEditorRow";
import { SchemaJsonPreview } from "~/components/schema/SchemaJsonPreview";
import { useSchemaStore, type FieldType } from "~/stores/schema-store";
import { getMockAIResponse } from "~/lib/ai-mock";
import { applyPreview } from "~/lib/apply-preview";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { toast } from "sonner";

// crude type inference for the per-row ✨ suggestion
function suggestType(name: string): FieldType {
  const n = name.toLowerCase();
  if (n.includes("email")) return "email";
  if (n.includes("url") || n.includes("link")) return "url";
  if (n.endsWith("at") || n.includes("date") || n.includes("time")) return "date";
  if (n.includes("price") || n.includes("amount") || n.includes("count") || n.includes("qty") || n.includes("stock")) return "number";
  if (n.startsWith("is") || n.startsWith("has")) return "boolean";
  if (n.includes("description") || n.includes("body") || n.includes("content")) return "text";
  if (n.includes("meta") || n.includes("json") || n.includes("config")) return "json";
  return "string";
}

export default function SchemaModelEditor() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const model = useSchemaStore((s) => s.models.find((m) => m.id === modelId));
  const { addField, updateField, deleteField, reorderFields, updateModel } = useSchemaStore();
  const [aiInput, setAiInput] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!model) {
    return (
      <PageBody className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Model bulunamadı.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/schema")}>
            Schema'ya dön
          </Button>
        </div>
      </PageBody>
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !model) return;
    const from = model.fields.findIndex((f) => f.id === active.id);
    const to = model.fields.findIndex((f) => f.id === over.id);
    if (from !== -1 && to !== -1) reorderFields(model.id, from, to);
  }

  function runAiAdd() {
    if (!aiInput.trim() || !model) return;
    const res = getMockAIResponse(aiInput, { model: model.name });
    if (res.preview && res.preview.kind === "fields") {
      const summary = applyPreview({ ...res.preview, targetModel: model.name });
      toast.success("AI alanları eklendi", { description: summary });
    } else {
      toast.info("Bu istek için alan önerisi üretemedim", {
        description: "Örnek: \"fiyat ve stok ekle\" ya da \"SEO alanları ekle\".",
      });
    }
    setAiInput("");
  }

  return (
    <>
      <PageHeader
        title={model.name}
        description={model.description ?? `${model.tableName} · ${model.fields.length} alan`}
        actions={[
          { label: "Alan Ekle", icon: Plus, variant: "default", onClick: () => addField(model.id) },
        ]}
      >
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" render={<Link to="/schema" />}>
          <ArrowLeft className="size-4" /> Modeller
        </Button>
      </PageHeader>

      <PageBody className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {/* AI add-field bar */}
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2">
            <Sparkles className="ml-1 size-4 shrink-0 text-primary" />
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAiAdd()}
              placeholder="AI ile alan ekle — örn. 'fiyat ve stok ekle'"
              className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button size="sm" className="h-8 gap-1.5" onClick={runAiAdd}>
              <Wand2 className="size-3.5" /> Üret
            </Button>
          </div>

          {/* Field rows */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={model.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {model.fields.map((field) => (
                  <FieldEditorRow
                    key={field.id}
                    field={field}
                    onChange={(patch) => updateField(model.id, field.id, patch)}
                    onDelete={() => deleteField(model.id, field.id)}
                    onSuggest={() => {
                      const t = suggestType(field.name);
                      updateField(model.id, field.id, { type: t });
                      toast.success("AI tip önerisi", { description: `${field.name} → ${t}` });
                    }}
                  />
                ))}
                {model.fields.length === 0 && (
                  <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                    Henüz alan yok. "Alan Ekle" ya da AI çubuğunu kullanın.
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Model-level options */}
          <div className="flex flex-wrap gap-5 rounded-xl border bg-card p-3 text-sm">
            <label className="flex items-center gap-2">
              <Switch
                checked={model.timestamps}
                onCheckedChange={(v) => updateModel(model.id, { timestamps: v })}
              />
              <span>timestamps</span>
            </label>
            <label className="flex items-center gap-2">
              <Switch
                checked={model.softDelete}
                onCheckedChange={(v) => updateModel(model.id, { softDelete: v })}
              />
              <span>soft-delete</span>
            </label>
          </div>
        </div>

        {/* Live preview */}
        <SchemaJsonPreview model={model} />
      </PageBody>
    </>
  );
}
