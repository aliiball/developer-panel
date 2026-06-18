# MetaPanel — Enterprise-Grade Surface Standard

Her sayfa (route) bu standarda yükseltilir. Amaç: MVP "tek tablo + sayaç"
seviyesinden, gerçek bir SaaS yönetim panelinin derinliğine geçmek.
Sığ içerik değil; **yön, bağlam, izlenebilirlik ve eylem.**

## Sayfa anatomisi (list/data sayfaları)

```
PageHeader (başlık + açıklama + birincil aksiyonlar)
└─ PageBody
   ├─ KPI şeridi        → 3–4 × <KpiCard> (delta + sparkline)
   ├─ <FilterBar>       → arama + <FilterChip> filtreleri + Export + Kolonlar
   ├─ <BulkBar>         → satır seçiliyse toplu işlemler
   ├─ İçerik            → <DataTable> / kart grid / grafik
   │                      durumlar: yükleniyor=<TableSkeleton>, boş=<EmptyState>,
   │                      filtre-boş=<EmptyState variant="search">
   └─ <DetailDrawer>    → satıra tıkla → sekmeli detay (Genel / Aktivite / JSON)
                          Aktivite sekmesi = <AuditTimeline>
```

## 8 sütun (her sayfada uygulanır, türüne göre)

1. **Veri durumları** — loading (skeleton), empty, no-results, error. Asla boş ekran/zıplama.
2. **Güçlü grid** — arama + çoklu filtre + sort + kolon göster/gizle + satır seçimi + toplu işlem + Export (CSV/JSON via toast).
3. **Detay yüzeyi** — `DetailDrawer` ile sekmeli detay; ilişkili kayıtlar + ham veri + audit.
4. **Insight katmanı** — çıplak sayı değil delta'lı KPI + sparkline; dashboard/rapor sayfalarında gerçek grafik (recharts).
5. **Eylem derinliği** — inline edit, optimistic update, onay diyalogları (yıkıcı işlem), `sonner` toast geri bildirimi, undo imkanı.
6. **Yönetişim** — durum/SLA rozetleri, "son güncelleyen/ne zaman", audit timeline, RBAC-duyarlı ipuçları.
7. **Gerçekçi yoğunluk** — 3 satır mock değil; sayfa türüne uygun 8–20+ gerçekçi kayıt. Page-local seed dosyanda ekle.
8. **Cila** — a11y (aria, klavye, focus), responsive (grid → stack), tutarlı yoğunluk, tabular-nums sayılar.

## Kullanılacak paylaşılan katman (import yolları)

```ts
import {
  EmptyState, Skeleton, TableSkeleton, KpiSkeleton, CardSkeleton,
  KpiCard, FilterBar, FilterChip, BulkBar,
  DetailDrawer, Field, type DrawerTab,
  AuditTimeline, type AuditEvent,
} from "~/components/enterprise";
```

Mevcut UI primitifleri (zaten var, bunları kullan):
`~/components/ui/{button,badge,card,dialog,sheet,tabs,select,input,textarea,label,checkbox,switch,dropdown-menu,data-table,scroll-area,separator,tooltip}`
Shell: `~/components/shell/PageHeader` → `PageHeader`, `PageBody`.
İkonlar: **yalnızca `@phosphor-icons/react`** (lucide YASAK).
Grafik: `recharts` (zaten bağımlı).
Toast: `import { toast } from "sonner"`.

### Bileşen sözleşmeleri (özet)

- `KpiCard({ label, value, delta?, trend?: number[], icon?, hint?, invert? })` — delta yön+renk, trend sparkline.
- `FilterBar({ search?, onSearch?, placeholder?, children?, onExport?, columns? })` — children = `<FilterChip>`'ler.
- `FilterChip({ active?, onClick?, count?, children })`.
- `BulkBar({ count, onClear, children })` — count=0 ise gizli.
- `DetailDrawer({ open, onOpenChange, title, subtitle?, badge?, tabs?: DrawerTab[], footer?, children? })`.
- `Field({ label, mono?, children })` — detay etiket/değer satırı.
- `AuditTimeline({ events: AuditEvent[] })`, `AuditEvent = { id, action, actor?, at, icon?, tone?, detail? }`.
- `EmptyState({ icon?, title, description?, action?, variant? })`.

## Sayfa türlerine göre vurgu

- **Liste/CRUD** (issues, team, api-keys, webhooks, logs, errors, releases, flags, environments, migrations, agent-runs, notifications, scheduler, media, modules, data) → tam grid anatomisi + DetailDrawer + KPI.
- **Dashboard / activity / reports / health** → insight ağırlıklı: KPI şeridi (delta+spark), gerçek grafikler, dönem karşılaştırma, "neden böyle" özetleri.
- **Editör/görsel** (schema, erd, forms, code, theme, api-explorer, terminal) → türüne uygun cila: boş durumlar, panel başlıkları, klavye ipuçları, kaydet/geri-al akışı; tabloya zorlama.
- **ai-copilot** → konuşma derinliği, örnek prompt kütüphanesi, sonuç önizleme.

## Sıkı kurallar (workflow ajanları için)

- **Yalnızca kendi route dosyanı düzenle.** Paylaşılan veri dosyalarını (`app/data/*` ortak olanlar) ve `app/components/**` paylaşılan bileşenleri DEĞİŞTİRME.
- Daha fazla seed gerekiyorsa **kendi route dosyanın içinde** veya `app/data/seed.<sayfa>.ts` adında YENİ bir dosyada ekle.
- Route sözleşmesini koru: `export default function`, `export function meta()`, mevcut store/tip kullanımları bozulmasın.
- Yalnızca yukarıda listelenen import'ları kullan; var olmayan API uydurma.
- Türkçe metin (mevcut dil), orijinal teknik terimler korunur.
- Sonuç **derlenebilir** olmalı (tsc temiz).
