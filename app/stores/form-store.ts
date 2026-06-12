import { create } from "zustand";

export type FormFieldKind =
  | "text"
  | "number"
  | "email"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "date"
  | "file"
  | "heading"
  | "divider";

export interface FormFieldDef {
  id: string;
  kind: FormFieldKind;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  helpText?: string;
  /** simple conditional: show when another field has a truthy value */
  showWhen?: string;
  validation?: string;
}

function fid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ff_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `ff_${Math.floor(performance.now() * 1000).toString(36)}`;
}

interface FormState {
  fields: FormFieldDef[];
  selectedId: string | null;
  add: (kind: FormFieldKind, atIndex?: number) => void;
  addMany: (fields: Omit<FormFieldDef, "id">[]) => void;
  insertField: (field: FormFieldDef, atIndex: number) => void;
  update: (id: string, patch: Partial<FormFieldDef>) => void;
  remove: (id: string) => void;
  reorder: (from: number, to: number) => void;
  select: (id: string | null) => void;
}

const DEFAULT_LABELS: Record<FormFieldKind, string> = {
  text: "Metin",
  number: "Sayı",
  email: "E-posta",
  textarea: "Uzun metin",
  select: "Açılır liste",
  checkbox: "Onay kutusu",
  radio: "Seçenek",
  date: "Tarih",
  file: "Dosya",
  heading: "Başlık",
  divider: "Ayraç",
};

export function makeField(
  kind: FormFieldKind,
  overrides: Partial<FormFieldDef> = {},
): FormFieldDef {
  return {
    id: fid(),
    kind,
    label: DEFAULT_LABELS[kind],
    required: false,
    options:
      kind === "select" || kind === "radio"
        ? ["Seçenek 1", "Seçenek 2"]
        : undefined,
    ...overrides,
  };
}

export const useFormStore = create<FormState>((set) => ({
  fields: [
    makeField("text", { label: "Ad Soyad", required: true, placeholder: "Adınız" }),
    makeField("email", { label: "E-posta", required: true, placeholder: "ornek@mail.com" }),
    makeField("textarea", { label: "Mesaj", placeholder: "Mesajınız…" }),
  ],
  selectedId: null,

  add: (kind, atIndex) =>
    set((s) => {
      const f = makeField(kind);
      const fields = [...s.fields];
      fields.splice(atIndex ?? fields.length, 0, f);
      return { fields, selectedId: f.id };
    }),

  addMany: (defs) =>
    set((s) => ({
      fields: [...s.fields, ...defs.map((d) => makeField(d.kind, d))],
    })),

  insertField: (field, atIndex) =>
    set((s) => {
      const fields = [...s.fields];
      fields.splice(atIndex, 0, field);
      return { fields, selectedId: field.id };
    }),

  update: (id, patch) =>
    set((s) => ({
      fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  remove: (id) =>
    set((s) => ({
      fields: s.fields.filter((f) => f.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  reorder: (from, to) =>
    set((s) => {
      const fields = [...s.fields];
      const [moved] = fields.splice(from, 1);
      fields.splice(to, 0, moved);
      return { fields };
    }),

  select: (id) => set({ selectedId: id }),
}));
