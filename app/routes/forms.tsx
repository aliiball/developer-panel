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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Sparkles, Eraser } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { FieldPalette } from "~/components/forms/FieldPalette";
import { CanvasField } from "~/components/forms/FormCanvas";
import { FieldProps } from "~/components/forms/FieldProps";
import { FieldRenderer } from "~/components/forms/FieldRenderer";
import { useFormStore } from "~/stores/form-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Form Builder — MetaPanel" }];
}

export default function Forms() {
  const fields = useFormStore((s) => s.fields);
  const selectedId = useFormStore((s) => s.selectedId);
  const { add, update, remove, reorder, select } = useFormStore();
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from !== -1 && to !== -1) reorder(from, to);
  }

  const schema = {
    fields: fields.map((f) => ({
      name: f.label,
      type: f.kind,
      required: f.required ?? false,
      ...(f.options ? { options: f.options } : {}),
    })),
  };

  return (
    <>
      <PageHeader
        title="Form Builder"
        description="Sürükle-bırak form oluşturucu. Soldan alan ekle, ortada düzenle, sağda ayarla."
        actions={[
          { label: "AI ile Form", icon: Sparkles, variant: "default", onClick: () => queuePrompt("Bir iletişim formu oluştur: ad, e-posta, konu, mesaj.") },
        ]}
      />
      <PageBody grid={false} className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_280px]">
        {/* Palette */}
        <aside className="lg:border-r lg:pr-4">
          <FieldPalette onAdd={(kind) => add(kind)} />
        </aside>

        {/* Canvas / Preview / JSON */}
        <Tabs defaultValue="canvas" className="flex min-w-0 flex-col">
          <div className="mb-3 flex items-center gap-2">
            <TabsList className="h-8">
              <TabsTrigger value="canvas" className="text-xs">Tuval</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Önizleme</TabsTrigger>
              <TabsTrigger value="json" className="text-xs">JSON Şema</TabsTrigger>
            </TabsList>
            <span className="ml-auto text-xs text-muted-foreground">{fields.length} alan</span>
          </div>

          <TabsContent value="canvas" className="m-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {fields.map((f) => (
                    <CanvasField
                      key={f.id}
                      field={f}
                      selected={f.id === selectedId}
                      onSelect={() => select(f.id)}
                      onDelete={() => remove(f.id)}
                    />
                  ))}
                  {fields.length === 0 && (
                    <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                      Soldaki paletten alan ekleyerek başlayın.
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>

          <TabsContent value="preview" className="m-0">
            <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-5">
              {fields.map((f) => (
                <FieldRenderer key={f.id} field={f} />
              ))}
              <Button className="w-full">Gönder</Button>
            </div>
          </TabsContent>

          <TabsContent value="json" className="m-0">
            <pre className="mp-scroll max-h-[calc(100vh-16rem)] overflow-auto rounded-xl border bg-card p-4 font-mono text-xs">
              <code>{JSON.stringify(schema, null, 2)}</code>
            </pre>
          </TabsContent>
        </Tabs>

        {/* Props */}
        <aside className="lg:border-l lg:pl-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Alan Özellikleri
            </p>
            {selected && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => { remove(selected.id); toast.success("Alan silindi"); }}>
                <Eraser className="size-3" /> Sil
              </Button>
            )}
          </div>
          <FieldProps field={selected} onChange={(patch) => selected && update(selected.id, patch)} />
        </aside>
      </PageBody>
    </>
  );
}
