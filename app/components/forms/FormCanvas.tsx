import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DotsSixVertical as GripVertical,
  Trash as Trash2,
} from "@phosphor-icons/react";
import type { FormFieldDef } from "~/stores/form-store";
import { cn } from "~/lib/utils";
import { FieldRenderer } from "~/components/forms/FieldRenderer";

export function CanvasField({
  field,
  selected,
  onSelect,
  onDelete,
}: {
  field: FormFieldDef;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group relative rounded-lg border bg-card p-3 transition-colors",
        selected ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/30",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
          aria-label="Sürükle"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Sil"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <FieldRenderer field={field} />
    </div>
  );
}
