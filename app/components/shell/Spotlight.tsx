import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { ALL_NAV, type NavItem } from "~/data/nav";
import { PROMPT_CHIPS } from "~/data/prompts";
import { useUIStore } from "~/stores/ui-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { useTheme } from "~/components/shell/ThemeProvider";
import { Sparkles, ArrowRight, CornerDownLeft, type LucideIcon } from "lucide-react";
import { Plus, Palette, Keyboard } from "lucide-react";
import { cn } from "~/lib/utils";

interface SpotItem {
  id: string;
  group: "Navigasyon" | "Eylemler" | "AI Komutları";
  label: string;
  icon: LucideIcon;
  hint: string;
  preview: { title: string; body: string; tag?: string };
  run: () => void;
}

export function Spotlight() {
  const open = useUIStore((s) => s.spotlightOpen);
  const setOpen = useUIStore((s) => s.setSpotlight);
  const navigate = useNavigate();
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const setShortcuts = useUIStore((s) => s.setShortcuts);
  const { toggle } = useTheme();
  const [value, setValue] = useState("nav-/");

  const items = useMemo<SpotItem[]>(() => {
    const close = () => setOpen(false);
    const GROUP_TAG: Record<NavItem["group"], string> = {
      core: "Sayfa",
      expansion: "Genişleme",
      delivery: "Teslimat",
      platform: "Platform",
    };
    const nav: SpotItem[] = ALL_NAV.map((n) => ({
      id: `nav-${n.to}`,
      group: "Navigasyon",
      label: n.label,
      icon: n.icon,
      hint: n.hotkey ? `⌘${n.hotkey}` : n.soon ? "Yakında" : "",
      preview: {
        title: n.label,
        body: n.desc,
        tag: GROUP_TAG[n.group],
      },
      run: () => {
        navigate(n.to);
        close();
      },
    }));

    const actions: SpotItem[] = [
      {
        id: "act-new-model",
        group: "Eylemler",
        label: "Yeni Model oluştur",
        icon: Plus,
        hint: "",
        preview: { title: "Yeni Model", body: "Schema sayfasında boş bir model oluştur.", tag: "Eylem" },
        run: () => { navigate("/schema?new=1"); close(); },
      },
      {
        id: "act-theme",
        group: "Eylemler",
        label: "Temayı değiştir (açık/koyu)",
        icon: Palette,
        hint: "",
        preview: { title: "Tema değiştir", body: "Açık ve koyu mod arasında geçiş yap.", tag: "Eylem" },
        run: () => { toggle(); close(); },
      },
      {
        id: "act-shortcuts",
        group: "Eylemler",
        label: "Klavye kısayollarını göster",
        icon: Keyboard,
        hint: "?",
        preview: { title: "Kısayollar", body: "Tüm klavye kısayollarının listesini aç.", tag: "Eylem" },
        run: () => { close(); setTimeout(() => setShortcuts(true), 50); },
      },
    ];

    const ai: SpotItem[] = PROMPT_CHIPS.map((c) => ({
      id: `ai-${c.id}`,
      group: "AI Komutları",
      label: `AI: ${c.label}`,
      icon: Sparkles,
      hint: "Copilot",
      preview: { title: c.label, body: c.prompt, tag: "AI Copilot" },
      run: () => { queuePrompt(c.prompt); close(); },
    }));

    return [...nav, ...actions, ...ai];
  }, [navigate, queuePrompt, setOpen, setShortcuts, toggle]);

  const active = items.find((i) => i.id === value) ?? items[0];

  const groups: SpotItem["group"][] = ["Navigasyon", "Eylemler", "AI Komutları"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] max-w-3xl translate-y-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Komut paleti</DialogTitle>
        <Command
          value={value}
          onValueChange={setValue}
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
        >
          <CommandInput placeholder="Sayfa, eylem veya AI komutu ara…" autoFocus />
          <div className="grid grid-cols-[1.4fr_1fr]">
            <CommandList className="mp-scroll max-h-[420px] border-r">
              <CommandEmpty>Sonuç yok.</CommandEmpty>
              {groups.map((g) => (
                <CommandGroup key={g} heading={g}>
                  {items
                    .filter((i) => i.group === g)
                    .map((i) => {
                      const Icon = i.icon;
                      return (
                        <CommandItem
                          key={i.id}
                          value={i.id}
                          keywords={[i.label, i.preview.body]}
                          onSelect={i.run}
                          className="gap-2.5"
                        >
                          <Icon
                            className={cn(
                              "size-4",
                              i.group === "AI Komutları" ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                          <span className="flex-1 truncate">{i.label}</span>
                          {i.hint && (
                            <kbd className="rounded bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                              {i.hint}
                            </kbd>
                          )}
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              ))}
            </CommandList>

            {/* Live preview pane — tracks the highlighted item */}
            <aside className="flex flex-col gap-3 bg-muted/20 p-4">
              {active && (
                <>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                    <active.icon className="size-5" />
                  </div>
                  {active.preview.tag && (
                    <span className="w-fit rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                      {active.preview.tag}
                    </span>
                  )}
                  <h3 className="text-sm font-semibold">{active.preview.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {active.preview.body}
                  </p>
                  <button
                    onClick={active.run}
                    className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {active.group === "AI Komutları" ? (
                      <>Copilot'a gönder <Sparkles className="size-3.5" /></>
                    ) : (
                      <>Git <ArrowRight className="size-3.5" /></>
                    )}
                  </button>
                </>
              )}
            </aside>
          </div>
          <div className="flex items-center gap-3 border-t bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="size-3" /> seç
            </span>
            <span>↑↓ gez</span>
            <span className="ml-auto">esc kapat · ⌘1-9 hızlı geçiş</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
