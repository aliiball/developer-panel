import { create } from "zustand";
import { SEED_MODELS } from "~/data/models";

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "email"
  | "url"
  | "json"
  | "text"
  | "relation"
  | "enum"
  | "computed";

export const FIELD_TYPES: FieldType[] = [
  "string", "number", "boolean", "date", "email", "url",
  "json", "text", "relation", "enum", "computed",
];

export interface SchemaField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  defaultValue?: string;
  description?: string;
  validation?: string;
  enumValues?: string[];
  relationModel?: string;
}

export interface SchemaModel {
  id: string;
  name: string;
  tableName: string;
  fields: SchemaField[];
  timestamps: boolean;
  softDelete: boolean;
  description?: string;
}

function uid(prefix = "f"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.floor(performance.now() * 1000).toString(36)}`;
}

interface SchemaState {
  models: SchemaModel[];
  addModel: (model: Partial<SchemaModel> & { name: string }) => string;
  updateModel: (id: string, patch: Partial<SchemaModel>) => void;
  deleteModel: (id: string) => void;
  getModel: (id: string) => SchemaModel | undefined;

  addField: (modelId: string, field?: Partial<SchemaField>) => void;
  updateField: (modelId: string, fieldId: string, patch: Partial<SchemaField>) => void;
  deleteField: (modelId: string, fieldId: string) => void;
  reorderFields: (modelId: string, from: number, to: number) => void;
}

function toTableName(name: string): string {
  const snake = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  return snake.endsWith("s") ? snake : `${snake}s`;
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
  models: SEED_MODELS,

  addModel: (model) => {
    const id = model.id ?? uid("m");
    const next: SchemaModel = {
      id,
      name: model.name,
      tableName: model.tableName ?? toTableName(model.name),
      fields: model.fields ?? [
        { id: uid(), name: "id", type: "number", required: true, unique: true, indexed: true },
      ],
      timestamps: model.timestamps ?? true,
      softDelete: model.softDelete ?? false,
      description: model.description,
    };
    set((s) => ({ models: [next, ...s.models] }));
    return id;
  },

  updateModel: (id, patch) =>
    set((s) => ({
      models: s.models.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  deleteModel: (id) =>
    set((s) => ({ models: s.models.filter((m) => m.id !== id) })),

  getModel: (id) => get().models.find((m) => m.id === id),

  addField: (modelId, field) =>
    set((s) => ({
      models: s.models.map((m) =>
        m.id === modelId
          ? {
              ...m,
              fields: [
                ...m.fields,
                {
                  id: uid(),
                  name: field?.name ?? "newField",
                  type: field?.type ?? "string",
                  required: field?.required ?? false,
                  unique: field?.unique ?? false,
                  indexed: field?.indexed ?? false,
                  defaultValue: field?.defaultValue,
                  description: field?.description,
                  validation: field?.validation,
                  enumValues: field?.enumValues,
                  relationModel: field?.relationModel,
                },
              ],
            }
          : m,
      ),
    })),

  updateField: (modelId, fieldId, patch) =>
    set((s) => ({
      models: s.models.map((m) =>
        m.id === modelId
          ? {
              ...m,
              fields: m.fields.map((f) =>
                f.id === fieldId ? { ...f, ...patch } : f,
              ),
            }
          : m,
      ),
    })),

  deleteField: (modelId, fieldId) =>
    set((s) => ({
      models: s.models.map((m) =>
        m.id === modelId
          ? { ...m, fields: m.fields.filter((f) => f.id !== fieldId) }
          : m,
      ),
    })),

  reorderFields: (modelId, from, to) =>
    set((s) => ({
      models: s.models.map((m) => {
        if (m.id !== modelId) return m;
        const fields = [...m.fields];
        const [moved] = fields.splice(from, 1);
        fields.splice(to, 0, moved);
        return { ...m, fields };
      }),
    })),
}));

export { uid as newId };
