import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Sparkles, Trash2 } from "lucide-react";
import type { SchemaField, FieldType } from "~/stores/schema-store";
import { FIELD_TYPES } from "~/stores/schema-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

export function FieldEditorRow({
  field,
  onChange,
  onDelete,
  onSuggest,
}: {
  field: SchemaField;
  onChange: (patch: Partial<SchemaField>) => void;
  onDelete: () => void;
  onSuggest: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-2 py-2",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Sürükle"
      >
        <GripVertical className="size-4" />
      </button>

      <input
        value={field.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="h-8 w-40 shrink-0 rounded-md border bg-background px-2 font-mono text-sm outline-none focus:border-primary/40"
      />

      <Select value={field.type} onValueChange={(v) => onChange({ type: v as FieldType })}>
        <SelectTrigger className="h-8 w-32 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_TYPES.map((t) => (
            <SelectItem key={t} value={t} className="font-mono text-xs">
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {field.type === "relation" && (
        <input
          value={field.relationModel ?? ""}
          onChange={(e) => onChange({ relationModel: e.target.value })}
          placeholder="→ Model"
          className="h-8 w-28 shrink-0 rounded-md border bg-background px-2 font-mono text-xs outline-none focus:border-primary/40"
        />
      )}

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Flag label="req" checked={field.required} onChange={(v) => onChange({ required: v })} />
        <Flag label="uniq" checked={field.unique} onChange={(v) => onChange({ unique: v })} />
        <Flag label="idx" checked={field.indexed} onChange={(v) => onChange({ indexed: v })} />

        <button
          onClick={onSuggest}
          className="text-muted-foreground transition-colors hover:text-primary"
          aria-label="AI tip önerisi"
          title="AI tip önerisi"
        >
          <Sparkles className="size-4" />
        </button>
        <button
          onClick={onDelete}
          className="text-muted-foreground transition-colors hover:text-destructive"
          aria-label="Sil"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Flag({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5">
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
    </label>
  );
}
