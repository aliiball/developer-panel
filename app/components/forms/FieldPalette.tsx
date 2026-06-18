import {
  TextT as Type,
  Hash,
  Envelope as Mail,
  TextAlignLeft as AlignLeft,
  CaretDown as ChevronDownSquare,
  CheckSquare,
  RadioButton as CircleDot,
  Calendar,
  UploadSimple as Upload,
  TextH as Heading,
  Minus,
} from "@phosphor-icons/react";
import type { FormFieldKind } from "~/stores/form-store";

const PALETTE: { kind: FormFieldKind; label: string; icon: typeof Type }[] = [
  { kind: "text", label: "Metin", icon: Type },
  { kind: "number", label: "Sayı", icon: Hash },
  { kind: "email", label: "E-posta", icon: Mail },
  { kind: "textarea", label: "Uzun metin", icon: AlignLeft },
  { kind: "select", label: "Açılır liste", icon: ChevronDownSquare },
  { kind: "checkbox", label: "Onay kutusu", icon: CheckSquare },
  { kind: "radio", label: "Seçenek", icon: CircleDot },
  { kind: "date", label: "Tarih", icon: Calendar },
  { kind: "file", label: "Dosya", icon: Upload },
  { kind: "heading", label: "Başlık", icon: Heading },
  { kind: "divider", label: "Ayraç", icon: Minus },
];

export function FieldPalette({ onAdd }: { onAdd: (kind: FormFieldKind) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Alanlar
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {PALETTE.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            onClick={() => onAdd(kind)}
            className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <Icon className="size-3.5 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
