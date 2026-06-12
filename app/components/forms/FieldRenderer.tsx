import type { FormFieldDef } from "~/stores/form-store";

// Renders a single form field as it would appear to an end-user. Used both in
// the canvas (decorated) and the live Preview tab.
export function FieldRenderer({ field }: { field: FormFieldDef }) {
  if (field.kind === "divider") return <hr className="my-1 border-border" />;
  if (field.kind === "heading")
    return <h3 className="text-sm font-semibold">{field.label}</h3>;

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-medium">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </label>

      {field.kind === "textarea" ? (
        <textarea
          disabled
          placeholder={field.placeholder}
          className="h-16 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 text-sm text-muted-foreground"
        />
      ) : field.kind === "select" ? (
        <select disabled className="h-9 w-full rounded-md border bg-background px-2.5 text-sm text-muted-foreground">
          {(field.options ?? []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : field.kind === "checkbox" ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" disabled className="size-4 rounded border" /> {field.label}
        </label>
      ) : field.kind === "radio" ? (
        <div className="space-y-1">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="radio" disabled name={field.id} className="size-3.5" /> {o}
            </label>
          ))}
        </div>
      ) : field.kind === "file" ? (
        <div className="flex h-9 items-center rounded-md border border-dashed bg-background px-2.5 text-sm text-muted-foreground">
          Dosya seç…
        </div>
      ) : (
        <input
          disabled
          type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
          placeholder={field.placeholder}
          className="h-9 w-full rounded-md border bg-background px-2.5 text-sm text-muted-foreground"
        />
      )}

      {field.helpText && <p className="text-[11px] text-muted-foreground">{field.helpText}</p>}
    </div>
  );
}
