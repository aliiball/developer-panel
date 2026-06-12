import type { FormFieldDef } from "~/stores/form-store";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

const HAS_PLACEHOLDER = new Set(["text", "number", "email", "textarea"]);
const HAS_OPTIONS = new Set(["select", "radio"]);

export function FieldProps({
  field,
  onChange,
}: {
  field: FormFieldDef | null;
  onChange: (patch: Partial<FormFieldDef>) => void;
}) {
  if (!field) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
        Özelliklerini düzenlemek için bir alan seçin.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Etiket">
        <Input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-8"
        />
      </Field>

      {HAS_PLACEHOLDER.has(field.kind) && (
        <Field label="Placeholder">
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className="h-8"
          />
        </Field>
      )}

      {HAS_OPTIONS.has(field.kind) && (
        <Field label="Seçenekler (her satıra bir)">
          <Textarea
            value={(field.options ?? []).join("\n")}
            onChange={(e) => onChange({ options: e.target.value.split("\n").filter(Boolean) })}
            className="min-h-20 text-sm"
          />
        </Field>
      )}

      <Field label="Yardım metni">
        <Input
          value={field.helpText ?? ""}
          onChange={(e) => onChange({ helpText: e.target.value })}
          className="h-8"
        />
      </Field>

      <Field label="Koşullu görünürlük (alan adı)">
        <Input
          value={field.showWhen ?? ""}
          onChange={(e) => onChange({ showWhen: e.target.value })}
          placeholder="örn. anotherField"
          className="h-8"
        />
      </Field>

      <label className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
        <span>Zorunlu alan</span>
        <Switch checked={field.required ?? false} onCheckedChange={(v) => onChange({ required: v })} />
      </label>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
