import type { AIPreview } from "~/lib/ai-mock";
import { useSchemaStore } from "~/stores/schema-store";
import { useThemeStore } from "~/stores/theme-store";
import { useFormStore } from "~/stores/form-store";

// Applies an AI preview to the relevant store. Returns a human summary for the
// success toast. Pure side-effect on stores — call from a click handler.
export function applyPreview(preview: AIPreview): string {
  switch (preview.kind) {
    case "models": {
      const { addModel } = useSchemaStore.getState();
      for (const m of preview.models) {
        addModel({
          name: m.name,
          tableName: m.tableName,
          description: m.description,
          fields: m.fields.map((field, i) => ({ ...field, id: `seed_${m.name}_${i}` })),
        });
      }
      return `${preview.models.length} model eklendi: ${preview.models.map((m) => m.name).join(", ")}`;
    }
    case "fields": {
      const { models, addField } = useSchemaStore.getState();
      const target =
        models.find((m) => m.name === preview.targetModel) ?? models[0];
      if (!target) return "Hedef model bulunamadı.";
      for (const field of preview.fields) addField(target.id, field);
      return `${preview.fields.length} alan eklendi → ${target.name}`;
    }
    case "palette": {
      const { setBrand } = useThemeStore.getState();
      setBrand(preview.colors);
      return "Marka paleti uygulandı.";
    }
    case "form": {
      const { addMany } = useFormStore.getState();
      addMany(preview.fields);
      return `${preview.fields.length} form alanı eklendi.`;
    }
    case "endpoints":
      return `${preview.endpoints.length} endpoint taslağı not edildi (mock).`;
    case "permissions":
      return `${preview.roleName} için ${preview.permissions.length} izin önerisi hazır.`;
    case "code":
      return "Kod önizlemesi Code Editor'e gönderildi (mock).";
    case "triage":
      return `${preview.items.length} issue için triyaj önerisi uygulandı (mock).`;
    case "release-notes":
      return `${preview.version} sürüm notları panoya kopyalandı (mock).`;
    default:
      return "Uygulandı.";
  }
}
