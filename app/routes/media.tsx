import { useState } from "react";
import { Upload, ImageIcon, FileText, Film, Music, Search } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { MEDIA, type MediaItem } from "~/data/expansion";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Media — MetaPanel" }];
}

const TYPE_ICON = { image: ImageIcon, video: Film, doc: FileText, audio: Music } as const;
const FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "image", label: "Görsel" },
  { key: "video", label: "Video" },
  { key: "doc", label: "Doküman" },
  { key: "audio", label: "Ses" },
] as const;

export default function Media() {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const items = MEDIA.filter(
    (m) => (filter === "all" || m.type === filter) && m.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Media"
        description="Medya kütüphanesi — görsel, video, doküman ve ses dosyaları."
        actions={[{ label: "Yükle", icon: Upload, variant: "default", onClick: () => toast.success("Dosya yükleme (mock)") }]}
      />
      <PageBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Dosya ara…"
              className="h-9 w-full rounded-lg border bg-card pl-8 pr-3 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  filter === f.key ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload dropzone */}
        <button
          onClick={() => toast.info("Sürükle-bırak yükleme (mock)")}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed bg-card/50 py-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Upload className="size-5" />
          <span className="text-sm">Dosyaları buraya sürükle veya tıkla</span>
        </button>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((m) => (
            <MediaCard key={m.id} item={m} />
          ))}
        </div>
      </PageBody>
    </>
  );
}

function MediaCard({ item }: { item: MediaItem }) {
  const Icon = TYPE_ICON[item.type];
  return (
    <button
      onClick={() => toast(item.name, { description: `${item.type} · ${item.size}${item.dims ? " · " + item.dims : ""}` })}
      className="group overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-primary/40"
    >
      <div
        className="flex aspect-square items-center justify-center"
        style={{ background: `linear-gradient(135deg, oklch(0.4 0.12 ${item.hue}), oklch(0.25 0.06 ${item.hue}))` }}
      >
        <Icon className="size-8 text-white/70" />
      </div>
      <div className="space-y-1 p-2">
        <p className="truncate text-xs font-medium">{item.name}</p>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-[9px]">{item.type}</Badge>
          <span className="text-[10px] text-muted-foreground">{item.size}</span>
        </div>
      </div>
    </button>
  );
}
