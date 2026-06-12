import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { useUIStore } from "~/stores/ui-store";
import { HOTKEY_NAV } from "~/data/nav";

const GLOBAL: { keys: string; label: string }[] = [
  { keys: "⌘K", label: "Spotlight (ara & komut)" },
  { keys: "⌘J", label: "Copilot panelini aç/kapat" },
  { keys: "?", label: "Bu kısayol listesi" },
  { keys: "Esc", label: "Aktif paneli kapat" },
];

export function ShortcutSheet() {
  const open = useUIStore((s) => s.shortcutsOpen);
  const setOpen = useUIStore((s) => s.setShortcuts);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Klavye Kısayolları</DialogTitle>
        </DialogHeader>

        <Section title="Genel">
          {GLOBAL.map((s) => (
            <Row key={s.keys} keys={s.keys} label={s.label} />
          ))}
        </Section>

        <Section title="Hızlı Geçiş">
          {HOTKEY_NAV.map((n) => (
            <Row key={n.to} keys={`⌘${n.hotkey}`} label={n.label} />
          ))}
        </Section>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md px-1 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-[11px]">{keys}</kbd>
    </div>
  );
}
