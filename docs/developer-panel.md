# MetaPanel — AI-First Geliştirici Paneli: Geliştirme Şartnamesi v2 (Claude Code için)

> **v2 notu:** Bu sürüm, mevcut referans repo'nun (`boraydeger32/metaframework-gelis-tirici-panel`) **kaynak kodu incelenerek** güncellendi. Repo'dan **fikir ve kapsam** alındı; **UI birebir kopyalanmadı.** Repo Next.js 16 + "Dynamic Island" navigasyonu kullanıyor; bu şartname bilinçli olarak **farklı bir stack (React Router v7) ve farklı bir navigasyon paradigması** öneriyor ki çıktı özgün olsun, kopya olmasın.

---

## 0. Referans Repo Analizi (ne öğrendik, neyi farklı yapıyoruz)

Repo'nun tamamı (RAPOR.md, 23 sayfa, tüm bileşenler, store'lar, deploy workflow) incelendi. Özet + ayrışma noktaları:

| Konu | Referans repo'da (mevcut) | Bu şartnamede (bizim — özgün) |
|---|---|---|
| Framework | **Next.js 16.2** (App Router) + React 19 | **React Router v7** (framework mode) + React 19 |
| AI | **Vercel AI SDK + Anthropic SDK** (gerçek) | **Mock AI motoru** (backend yok; simüle streaming) |
| State | Zustand + TanStack Query | Zustand (yalın) + Context; TanStack Query ertelendi |
| Editör | **Monaco Editor** | **CodeMirror 6** (daha hafif, farklı) |
| Navigasyon | **DynamicIsland** (üst-orta grid) + **ContextualDock** (alt-orta macOS dock) + **FloatingOrb** (sağ-alt AI orbu) — sidebar YOK | **Sol Rail + ⌘K Spotlight (liste+önizleme)** + **sağ Copilot Rail** + sayfa-içi **Action Bar** — dock/island/orb YOK |
| Sayfa sayısı | 23 sayfa | 12 çekirdek + genişleme listesi |
| Arka plan | AmbientBackground (gradient blob + noise) | **Statik ince grid + tek vurgu** (daha sakin, farklı imza) |
| Form/Validation | React Hook Form + Zod | React Hook Form + Zod (aynı — endüstri standardı) |
| Dağıtım | Next.js static export → `out/` → GH Pages | React Router SPA (`ssr:false`) → `build/client` → GH Pages |
| Tipografi | Geist Sans/Mono | **Inter + JetBrains Mono** (farklı) |

### Repo'dan aldığımız değerli fikirler (koruyup farklı uyguluyoruz)
1. **Geniş geliştirici yüzeyi (23 modül)** — gerçek metaframework zenginliği: ERD, Workflows, Permissions, Logs, Health, Scheduler, Webhooks, Terminal, Media, Reports, Docs, Data, Code Editor. Biz 12 çekirdek + "Yakında" rozetli genişleme yapıyoruz.
2. **Bağlam-duyarlı AI** — her sayfanın kendi AI ipucu + quick-reply'ı (FloatingOrb'daki `contextualHints`/`quickReplies` deseni). Biz sağ Copilot Rail'de uyguluyoruz.
3. **Proaktif AI önerileri** — kullanıcı istemeden beliren, sayfayla ilgili insight toast'ları (`AISuggestions`: insight / optimization / feature tipleri).
4. **Sayfaya-özel eylem çubuğu** — her sayfada o sayfaya ait hızlı eylemler (`ContextualDock`'taki `dockConfigs` deseni). Biz inline **Action Bar**'da yapıyoruz (dock değil).
5. **Klavye-öncelikli DX** — `?` kısayol cheat-sheet, ⌘K palette, ⌘1-9 sayfa geçişi (`KeyboardShortcuts` deseni).
6. **Tip-güvenli şema modeli** — `SchemaModel`/`SchemaField` Zustand store (string/number/boolean/date/email/url/json/text/relation/enum/computed tipleri, required/unique/indexed bayrakları).

### Bizim özgün imzamız (repo'dan net ayrışma)
Repo "her şey ekranda yüzer" (island + dock + orb + blob) konsepti. Biz **"sabit yapı + odaklanma"** konsepti seçiyoruz:
- İnce **sol Rail** (her zaman görünür, tooltip'li),
- ⌘K ile **tam-ekran Spotlight** — repo'nun ikon-grid'i yerine **iki kolon: filtrelenen liste + canlı önizleme**,
- sağda kapanabilir **Copilot Rail** (orb yerine sabit panel),
- **statik ince grid** arka plan (blob yerine), **tek vurgu rengi** + monokrom ikon.

Bu hem teknoloji (RR7 vs Next.js) hem etkileşim modeli (Rail+Spotlight vs Island+Dock+Orb) hem tasarım imzası açısından repo'dan belirgin biçimde farklıdır.

---

**TL;DR**
- **Stack:** React Router v7 (framework mode) + shadcn/ui (Radix) + cmdk + TanStack Table + Recharts + dnd-kit + CodeMirror 6 + Zustand + React Hook Form/Zod + Tailwind v4.
- **Kapsam:** Yalnızca frontend, tıklanabilir prototip. Backend YOK. Tüm AI çıktıları mock + simüle-streaming.
- **AI-first üç ayak:** (a) doğal dilden config/modül üretimi, (b) AI-destekli şema/kod önerisi + autocomplete, (c) ikisinin birleşimi.
- **Navigasyon imzası (özgün):** Sol Rail + ⌘K Spotlight (liste+önizleme) + sağ Copilot Rail + `?` kısayol paneli + sayfa-içi Action Bar.

---

## 1. Proje Özeti ve AI-First Vizyon

**MetaPanel**, Drupal / Frappe / Django Admin'i soyutlayan, **geliştirici-odaklı (DX-first)**, AI-native bir Geliştirici Paneli prototipidir. Hedef kitle son kullanıcı değil, geliştiricidir. Müşteri özelleştirmelerini (marka renkleri, custom fields, custom forms, custom modules) **kod üreterek** yönetir — AI kodu gereksiz kılmaz, hızlandırır.

**Metaframework kavram haritası:**
- **Model / DocType / Content Type** → veri yapısı (Frappe DocType = JSON → DB tablosu; Django Model; Drupal Entity).
- **Field / DocField** → tip, etiket, required, unique, indexed, default, validation, relation, enum (Frappe 30+ fieldtype).
- **Module / App** → modelleri gruplayan paket; lifecycle hook (install/activate/deactivate/uninstall), dependency graph, permission scoping.
- **Migration** → şema diff'ten üretilen değişiklik dosyası.
- **API Endpoint** → modelden auto-generated CRUD ucu.

**AI-First vizyon (üç ayağın TAMAMI):** doğal dilden üretim · AI-destekli öneri & autocomplete · ikisinin dokuya gömülü birleşimi (her sayfada bağlam-duyarlı Copilot, ⌘K, proaktif öneri).

> **Prototip kuralı:** AI gerçek LLM'e bağlanmaz. Tüm çıktılar `lib/ai-mock.ts`'ten gelen mock yanıtlardır, typewriter efektiyle sunulur. "Uygula" → ilgili Zustand store güncellenir. Hiçbir ağ çağrısı yok. (Referans repo gerçek Anthropic SDK kullanır; biz bilinçli olarak mock kalıyoruz çünkü bu faz backend'siz.)

---

## 2. Teknoloji Kararı

### 2.1 Kombinasyon
**React Router v7 + shadcn/ui + Radix + cmdk + TanStack Table + Recharts + dnd-kit + CodeMirror 6 + Zustand + React Hook Form + Zod + lucide-react + Tailwind v4.**

| Katman | Seçim | Not |
|---|---|---|
| Framework | **React Router v7** | Repo Next.js → biz RR7 ile ayrışıyoruz |
| Bileşen/stil | **shadcn/ui** (new-york, Radix) | Copy-in → Claude Code dostu |
| Komut paleti | **cmdk** | shadcn Command zaten cmdk |
| Tablo | **TanStack Table** | Model/alan/endpoint listeleri |
| Grafik | **Recharts** | Metrik, sparkline |
| Sürükle-bırak | **dnd-kit** | Form/şema/ERD |
| Kod editörü | **CodeMirror 6** | Repo Monaco → biz CM6 (hafif) |
| State | **Zustand** | schema/module/theme store |
| Form doğrulama | **React Hook Form + Zod** | Tip-güvenli |
| İkon | **lucide-react** | shadcn varsayılan |
| Sunucu durumu | **TanStack Query** | Bu fazda ERTELENDİ |

### 2.2 Neden Flowbite değil
shadcn kaynak kodu projeye kopyalanır → tam sahiplik, AI-codegen dostu, lock-in yok. Radix ile a11y + command palette/data table hazır. Linear/Vercel/Supabase estetiği fiili standardı. Flowbite vendor lock-in, sınırlı headless, zayıf a11y, customization tavanı. (Repo RAPOR.md de aynı sonuca varıyor.)

### 2.3 RR7 + Tailwind + shadcn uyumu
shadcn resmi RR7 kılavuzu var; `npx shadcn@latest init` RR7'yi algılar; `~/` alias; Tailwind v4 + React 19 varsayılan; `@theme` + OKLCH; `data-slot`, `forwardRef` yok.

> **v2.1 not (uygulama gerçeği):** Mid-2026 `shadcn@latest init` artık **`base-nova`** stilini kuruyor — primitifler **Radix değil [Base UI](https://base-ui.com)** (`@base-ui/react`). API farkları: kompozisyon için `asChild` yerine **`render={<El/>}`** prop'u; Tooltip gecikmesi `delayDuration` yerine **Provider'da `delay`**. Bu prototip Base UI ile kuruldu ve sorunsuz çalışıyor; tüm bileşen prop'ları tip-güvenli (TS mismatch'leri build'de yakalandı). Radix istenirse `init -b radix` ile zorlanabilir.

### 2.4 TanStack Query neden ertelendi
Backend yok → server-state gerekmez. İleride FastAPI eklenince RR7 loader + `queryClient.ensureQueryData` ile eklenir.

### 2.5 Sürüm sabitleme (mid-2026)
```
react-router 7.17.0 · @react-router/dev 7.17.0 · tailwindcss 4.x
shadcn latest · cmdk 1.1.1 · @tanstack/react-table 8.21.3 (v9 beta — stabil 8.x)
recharts 3.8.1 · @dnd-kit/core 6.3.1 · lucide-react 1.17.0
zustand 5.x · react-hook-form 7.78 · zod 4.x · @uiw/react-codemirror 4.x
@tanstack/react-query KURMA (ertelendi)
```
> **Sürüm notu (doğrulandı):** Tüm pinler npm registry'de gerçek/güncel. **`lucide-react` artık 1.x serisinde — 1.17.0 DOĞRU** (eski "0.x" varsayımı geçersiz, downgrade etme). `react-router` ve `@react-router/dev` **aynı sürümde** (7.17.0) tutulmalı; minor drift build kırar.
> **Tedarik zinciri savunması:** 2026 ortası "Node-gyp Supply Chain Compromise – June 2026" (Socket raporu) bazı npm paketlerini etkiledi → `package-lock.json` **commit et**, CI'da floating `latest` yerine **`npm ci`**, kurulum sonrası `npm audit`.

---

## 3. Dosya / Klasör Yapısı (RR7 framework mode)

```
metapanel/
├── react-router.config.ts        # ssr: false
├── vite.config.ts                # base: "/metapanel/"
├── components.json               # shadcn (new-york, ~/)
├── package.json
├── public/404.html               # SPA fallback (index.html kopyası)
├── .github/workflows/deploy.yml  # GH Pages
├── app/
│   ├── root.tsx                  # kabuk, ThemeProvider, HydrateFallback, global rail'ler
│   ├── routes.ts
│   ├── app.css                   # Tailwind v4 + tokenlar
│   ├── routes/
│   │   ├── _shell.tsx            # LeftRail + Topbar + CopilotRail + Outlet + Spotlight + ShortcutSheet
│   │   ├── dashboard.tsx         # /
│   │   ├── ai-copilot.tsx        # /ai-copilot
│   │   ├── schema.tsx            # /schema
│   │   ├── schema.$modelId.tsx   # /schema/:modelId
│   │   ├── erd.tsx               # /erd
│   │   ├── data.tsx              # /data
│   │   ├── forms.tsx             # /forms
│   │   ├── modules.tsx           # /modules
│   │   ├── permissions.tsx       # /permissions
│   │   ├── theme.tsx             # /theme
│   │   ├── api-explorer.tsx      # /api-explorer
│   │   ├── code.tsx              # /code (CodeMirror)
│   │   ├── activity.tsx          # /activity
│   │   └── settings.tsx          # /settings
│   ├── components/
│   │   ├── ui/                   # shadcn
│   │   ├── shell/ { LeftRail, Topbar, ActionBar, Spotlight, ShortcutSheet }
│   │   ├── copilot/ { CopilotRail, ChatMessage, PromptChips, StreamingText, DiffPreview, ProactiveTip }
│   │   ├── dashboard/ { StatCard, ActivityFeed, InsightStrip }
│   │   ├── schema/ { ModelTable, FieldEditorRow, FieldTypePicker, SchemaJsonPreview }
│   │   ├── forms/ { FormCanvas, FieldPalette, FieldProps }
│   │   ├── modules/ { ModuleCard, DependencyGraph }
│   │   ├── permissions/ { PermissionMatrix }
│   │   ├── theme/ { ColorEditor, ContrastBadge, TokenExport }
│   │   └── erd/ { ErdCanvas, ErdNode }
│   ├── lib/ { utils.ts (cn), ai-mock.ts, contrast.ts, codegen.ts }
│   ├── stores/ { schema-store.ts, module-store.ts, theme-store.ts, copilot-store.ts }
│   └── data/ { models.ts, modules.ts, activities.ts, endpoints.ts, metrics.ts, prompts.ts, permissions.ts }
└── README.md
```

### 3.1 Statik dağıtım (GitHub Pages)
- `react-router.config.ts`: `export default { ssr: false } satisfies Config;`
- `vite.config.ts`: `base: process.env.NODE_ENV === "production" ? "/metapanel/" : "/"`
- `ssr:false` runtime SSR'ı kapatır ama build'de `index.html` üretilir → root route SSR-güvenli olmalı (`window`/`localStorage` sadece `useEffect`/clientLoader'da).
- Build sonrası `index.html` → `404.html` kopyala. Navigasyonda hep `<Link>`. Root'a `HydrateFallback`.
- Workflow: Node 20 → `npm ci` → `npm run build` → artifact path **`build/client`** (Next.js'in `out/` yerine RR7 SPA çıktısı) → `upload-pages-artifact` → `deploy-pages`.

> **⚠ Kritik dağıtım kuralı (v2.1 — doğrulandı):** RR7'de **React Router `basename` + `prerender` kombinasyonu v7.2.0+ regresyonludur** (issue #13615/#14587: prerender sessizce no-op olur, derin route'lar "No routes matched"). Bu yüzden:
> - **React Router `basename` KULLANMA.** Subpath için yalnızca **Vite `base: "/metapanel/"`** (asset prefix) yeterli — farklı mekanizma, regresyondan etkilenmez.
> - **`prerender` array EKLEME.** Düz `ssr:false` = tek `index.html` + SPA hydrate modeli; bu istenen şey.
> - Derin route fallback'i **yalnızca `index.html → 404.html` kopyası** ile sağlanır (GH Pages'in `_redirects` eşdeğeri).

---

## 4. Sayfa Bazlı Bileşen Spesifikasyonları

> Tüm etkileşimler frontend-only. "Uygula/Kaydet" → Zustand store + toast (sonner). 12 çekirdek sayfa; ERD/Data/Permissions/API/Code repo'dan ilham alınan genişlemelerdir.

**4.1 Dashboard (`/`)** — Başlık + "AI ile Başla". **InsightStrip** (AI öneri şeridi). **StatCard×4:** Models 12 (+2 bu hafta) · Modules 8 (3 aktif) · API Endpoints 47 (auto-generated) · Migrations 23 (son: 2 saat önce); sparkline (Recharts), tıklanınca ilgili sayfa. **ActivityFeed:** Model güncellendi (Customer, 5dk) · Modül etkinleştirildi (E-Commerce, 1sa) · Migration (003_add_orders, 2sa) · API (/api/products, 3sa) · Tema (Brand Primary, 5sa). **Action Bar:** Yeni Model · AI Copilot · Modül Ekle · Tema · Metrikler.

**4.2 AI Copilot (`/ai-copilot`) — kalp** — Boş durum: "Ne oluşturmak istersiniz?" + **PromptChips** ("Blog modülü oluştur", "E-ticaret şeması", "Renk paleti oluştur WCAG AA", "API endpoint'leri CRUD"). Sohbet: kullanıcı(sağ)/AI(sol) + **StreamingText**. **DiffPreview:** üretilen config önizleme (alan tablosu/kod bloğu) + **Uygula / Reddet / Alternatif üret**. `ai-mock.ts`: blog→BlogPost+Category; e-ticaret→Product/Order/OrderItem/Category; renk/WCAG→palet; endpoint/CRUD→5 endpoint.

**4.3 Schema (`/schema`, `/schema/:modelId`)** — `/schema`: TanStack Table (Model, machine name, alan, ilişki, güncelleme, durum) + arama/sıralama + "+ Yeni Model" + "AI ile Oluştur". `:modelId`: **FieldEditorRow** (dnd-kit grip, etiket, machine name, **FieldTypePicker** [string/number/boolean/date/email/url/json/text/relation/enum/computed — repo tip seti], required/unique/indexed switch, default, "✨" AI tip önerisi) + canlı **SchemaJsonPreview**. Üstte "AI ile alan ekle" ("fiyat ve stok ekle" → 2 alan önizleme → Uygula).

**4.4 ERD (`/erd`)** — repo'dan ilham, özgün: SVG node (ErdNode) + ilişki çizgileri, dnd-kit ile sürükleme (mock pozisyon), "AI: ilişkileri öner". Salt görsel.

**4.5 Data Manager (`/data`)** — seçili model için TanStack Table kayıt listesi (mock) + filtre + "Yeni Kayıt" + Import/Export (mock) + inline düzenleme görseli.

**4.6 Form Builder (`/forms`)** — 3 panel: **FieldPalette** (metin, sayı, dropdown, checkbox, radio, tarih, dosya, başlık, ayraç) · **FormCanvas** (dnd-kit) · **FieldProps** (etiket, placeholder, zorunlu, koşullu görünürlük, validation). Sekme: Tuval / Önizleme / JSON Şema. "AI ile form oluştur".

**4.7 Modules (`/modules`)** — **ModuleCard** ızgara: ad, açıklama, ikon, sürüm, durum switch, **dependencies**, "Config". 8 modül (E-Commerce, Blog, CRM, Inventory, Auth & Permissions, Payments, Media, API Gateway). Sekme: Kurulu / Aktif / Marketplace. **DependencyGraph** (mock SVG). "AI Scaffold".

**4.8 Permissions (`/permissions`)** — repo'dan ilham: **PermissionMatrix** roller×izinler checkbox matrisi + "Yeni Rol" + "AI Öner" (önerilen izin seti → Uygula). Mock.

**4.9 Theme (`/theme`)** — **ColorEditor** (primary/secondary/accent/neutral/semantic, açık+koyu) + **ContrastBadge** (WCAG: AA 4.5:1, büyük 3:1, AAA 7:1; `contrast.ts`); Fail → AI düzeltme önerisi. Canlı önizleme (CSS değişkeni). **TokenExport:** CSS vars / Tailwind config / design tokens JSON.

**4.10 API Explorer (`/api-explorer`)** — repo'dan ilham: auto-generated endpoint listesi (method rozetli) + request/response örneği (mock, Swagger/GraphiQL benzeri) + "Test Et" (mock) + "AI Docs".

**4.11 Code Editor (`/code`)** — CodeMirror 6 (repo Monaco; biz CM6): sol dosya ağacı (mock) + editör (üretilen şema/migration kodu) + "AI ile düzenle" + syntax highlight.

**4.12 Activity (`/activity`) + Settings (`/settings`)** — Activity: Recharts grafikleri (API çağrı/haftalık, model büyümesi, modül kullanımı) + filtrelenebilir aktivite akışı + endpoint tablosu. Settings: Genel / Görünüm (açık-koyu-sistem) / AI Copilot ayarları (mock) / Geliştirici (mock API key).

> **Genişleme listesi (v2.1: tam sayfa olarak GELİŞTİRİLDİ — "Her şey tam derinlikte" kapsamı):** Workflows (trigger→koşul→eylem zinciri), Terminal (komut geçmişli mock shell), Media (filtreli ızgara + dropzone), Email Templates (değişkenli canlı önizleme), Reports (model/metrik/grafik oluşturucu, Recharts), Scheduler (cron tablosu + toggle), Webhooks (uç nokta listesi + teslimat logu), Logs (seviye filtreli canlı akış), Health (servis durum kartları + uptime sparkline), Docs (TOC + auto endpoint referansı). Hepsi Rail'de gerçek route, mock verili, tasarım sistemiyle tutarlı — placeholder kalmadı.

---

## 4b. AI-First + Navigasyon Özellikleri (özgün imza)

1. **Sol Rail (`LeftRail`):** Daima görünür ince ikon şeridi (tooltip'li), aktif vurgu. (Repo'nun island'ı yerine sabit rail.)
2. **⌘K Spotlight (`Spotlight`, cmdk):** Tam-ekran. **İki kolon:** solda filtrelenen liste (Navigasyon/Eylemler/AI Komutları), sağda seçili öğenin **canlı önizlemesi**. (Repo'nun ikon-grid'inden farklı.) ⌘1-9 hızlı geçiş. "AI: ..." → Copilot Rail açılır, prompt dolu.
3. **Sağ Copilot Rail (`CopilotRail`):** Kapanabilir panel (orb yerine). **Bağlam-duyarlı:** her route için HINT + quick-reply (repo `contextualHints`/`quickReplies` fikri). Simüle streaming, kod kopyalama, "düşünüyor" animasyonu.
4. **Proaktif Öneri (`ProactiveTip`):** Aralıkla beliren, route'a uygun AI insight toast'ı (insight/optimization/feature — repo `AISuggestions` fikri). Sağ-üst, kapatılabilir.
5. **Action Bar (`ActionBar`):** Sayfa başlığı yanında, sayfaya özel hızlı eylemler (repo `dockConfigs` fikri; dock değil, inline bar).
6. **Shortcut Sheet (`ShortcutSheet`):** `?` ile açılan kısayol cheat-sheet (repo `KeyboardShortcuts`).
7. **DiffPreview & inline ✨:** uygula-öncesi önizleme; şema satırında AI tip önerisi; tema kontrast düzeltme.

---

## 5. Tasarım Sistemi (özgün — repo'dan ayrışan imza)

Repo: çok-renkli ikon + ambient blob + noise. **Biz:** **tek vurgu rengi disiplini** + **statik ince grid** (blob yok) + monokrom ikon (sadece aktif/hover renk). Daha sakin, "Linear" tarafında.
- Dark-first: bg `#0a0a0c`, surface `#111114`, fg `#ededed`, border `rgba(255,255,255,.08)`, muted `#a1a1aa`.
- Brand: indigo `#6366f1` (tek vurgu). Semantik: success emerald, warning amber, destructive red.
- Tipografi: **Inter + JetBrains Mono** (repo Geist → biz farklı).
- 4px ölçek, `--radius:.5rem`, ince border + hafif gölge, 200-300ms expo-out.
- Tokenlar shadcn `:root`/`.dark`; marka için `--brand`. Dark/light: `.dark` + SSR-güvenli ThemeProvider.

---

## 6. Örnek Bileşen Kod Parçaları (kısaltılmış — tam sürüm sohbetteki artifact'ta)

- **Spotlight** (cmdk, iki-kolon liste+önizleme): `Command.Input` + `Command.Group` (Navigasyon/AI) + sağda `sel.preview`. `onAskAI(prompt)` ile Copilot Rail tetikler.
- **StreamingText** (typewriter): `setInterval` ile karakter karakter + yanıp sönen cursor.
- **CopilotRail** (bağlam-duyarlı): `useLocation().pathname` → `HINTS`/`QUICK` map; `getMockAIResponse(q)` ile yanıt.
- **FieldEditorRow**: dnd-kit grip · etiket · machine-name (mono) · type Select (repo tip seti) · required/unique/indexed switch · ✨ AI · sil.
- **contrast.ts**: relative luminance → `contrastRatio` → `wcagLevel` (AAA≥7, AA≥4.5, AA Large≥3, Fail).

```ts
// contrast.ts (tam) — NOT: girişi önce 6-haneli hex'e normalize et (#fff kısa formu / rgb()/oklch kırılmasın)
function normHex(h:string){let c=h.trim().replace("#","");if(c.length===3)c=c.split("").map(x=>x+x).join("");return c.slice(0,6)}
export function contrastRatio(h1:string,h2:string){const lum=(h:string)=>{const c=normHex(h);const[r,g,b]=[0,2,4].map(i=>parseInt(c.substr(i,2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*r+.7152*g+.0722*b};const L1=lum(h1),L2=lum(h2);return(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)}
export function wcagLevel(r:number){return r>=7?"AAA":r>=4.5?"AA":r>=3?"AA Large":"Fail"}
```

---

## 7. Mock Veri & Store (repo tip modelini temel alır)

```ts
// stores/schema-store.ts (Zustand)
export type FieldType="string"|"number"|"boolean"|"date"|"email"|"url"|"json"|"text"|"relation"|"enum"|"computed";
export interface SchemaField { id:string; name:string; type:FieldType; required:boolean; unique:boolean; indexed:boolean; defaultValue?:string; description?:string; validation?:string; enumValues?:string[]; relationModel?:string; }
export interface SchemaModel { id:string; name:string; tableName:string; fields:SchemaField[]; timestamps:boolean; softDelete:boolean; description?:string; }
// addModel/updateModel/deleteModel/setActiveModel/addField/updateField/deleteField

// data/models.ts — Customer, Product, Order, Category, BlogPost ... (12)
// data/modules.ts — { id,name,description,icon,version,active,dependencies[],category } (8)
// data/endpoints.ts — { id,method,path,model,auto } (47, çoğu auto)
// data/activities.ts — { id,type:"model"|"module"|"migration"|"api"|"theme",title,target,timeAgo }
// data/permissions.ts — Role { id,name,permissions:Record<string,boolean> }
// lib/ai-mock.ts — getMockAIResponse(prompt) → { text, preview?:{kind,payload} }
```
Dashboard: Models **12** · Modules **8** · API Endpoints **47** · Migrations **23**.

---

## 8. Aşamalı Geliştirme (Claude Code için)

- **Faz 0 — Scaffold:** `create-react-router@latest metapanel` → **`shadcn init -t react-router`** (RR7 template flag'i; new-york, v4, `~/`) → shadcn ekle (`button card dialog command sheet input select switch badge table tabs dropdown-menu tooltip sonner separator scroll-area label textarea checkbox`) → kur (`lucide-react @tanstack/react-table recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities zustand react-hook-form @hookform/resolvers zod @uiw/react-codemirror @codemirror/lang-javascript @codemirror/lang-json @uiw/codemirror-theme-github`). `ssr:false` + `base`. **Eşik:** dev + shadcn butonu. (`label/textarea/checkbox` → Form/Theme; `@dnd-kit/modifiers,utilities` → grip + restrict-axis + cross-container drag; `lang-json` + dark tema → Code editör.)
- **Faz 1 — Shell + Navigasyon imzası:** `_shell.tsx` = LeftRail + Topbar + ActionBar slot + CopilotRail + Spotlight + ShortcutSheet + Outlet. ThemeProvider (dark, SSR-güvenli). `routes.ts` tüm route'lar (genişleme placeholder). ⌘K, `?`, ⌘1-9.
- **Faz 2 — Dashboard:** StatCard×4 + InsightStrip + ActivityFeed + ActionBar + sparkline.
- **Faz 3 — Copilot + CopilotRail + ProactiveTip:** `ai-mock.ts`, StreamingText, PromptChips, DiffPreview. Bağlam-duyarlı HINTS/QUICK. Proaktif toast.
- **Faz 4 — Schema:** ModelTable + `:modelId` FieldEditorRow (dnd-kit + tip seti + ✨) + SchemaJsonPreview + store.
- **Faz 5 — Form Builder:** 3 panel dnd-kit + palet + props + önizleme + JSON + AI form.
- **Faz 6 — Modules + Permissions:** ModuleCard + dependency switch + Marketplace + DependencyGraph; PermissionMatrix + AI öner.
- **Faz 7 — Theme:** ColorEditor + ContrastBadge + canlı önizleme + TokenExport + AI palet.
- **Faz 8 — Genişleme:** ERD (SVG+dnd-kit), Data (TanStack Table), API Explorer (mock req/res), Code (CodeMirror), Activity (Recharts), Settings.
- **Faz 9 — Polish + Deploy:** mikro-etkileşim, boş durum, toast, dark/light, ince grid, responsive, a11y, focus. GH Pages: `build/client` → workflow → `index.html`→`404.html`.

**Eşik notları:** RR7 `ssr:false`+`basename`+`prerender` 404 → prerender kaldır, saf SPA fallback. Backend gelince TanStack Query + RR7 loader. ERD karmaşıklaşırsa React Flow (xyflow).

---

## 9. Definition of Done (Kabul Kriterleri)

1. **12 çekirdek sayfa** tıklanabilir; genişleme sayfaları en az placeholder ("Yakında" rozetli).
2. **Navigasyon imzası çalışır:** Sol Rail aktif vurgu+tooltip; ⌘K Spotlight (liste+önizleme) açılır/filtreler/yönlendirir; ⌘1-9; `?` kısayol paneli; sağ Copilot Rail aç/kapa.
3. **AI-first üç ayak:** (a) Copilot'ta çip/serbest metin → simüle streaming → DiffPreview Uygula → store; (b) şema satırında ✨ tip önerisi + tema kontrast düzeltme; (c) Copilot Rail her sayfada bağlam-duyarlı + proaktif toast.
4. **Schema:** TanStack Table + alan editörü (dnd-kit, tip seti, required/unique/indexed) + canlı JSON; "Yeni Model" mock ekler, listede görünür.
5. **Theme:** WCAG rozetleri doğru (4.5/3/7); Fail için AI önerisi; canlı önizleme CSS değişkeni günceller; export çalışır.
6. **Modules/Permissions:** switch + dependency görünür; matris checkbox; "Uygula" toast.
7. **Tasarım imzası repo'dan ayrışır:** tek vurgu + statik grid + monokrom ikon (çok-renkli island/dock/blob YOK).
8. **Stack özgünlüğü:** React Router v7 + CodeMirror (Next.js + Monaco DEĞİL); mock AI (gerçek SDK çağrısı YOK).
9. **Statik dağıtım:** `npm run build` SPA üretir; GH Pages'de derin route'lar `404.html` fallback ile açılır.
10. **Kalite tabanı:** dark/light, mobil responsive, klavye focus görünür, reduced-motion saygılı, boş durumlar yönlendirici.

---

## Uyarılar
- Sürümler mid-2026; `@tanstack/react-table` v9 beta (8.21.3 kullan), recharts 3.9+ canary olabilir. `latest` doğrula.
- AI tamamen mock; "streaming" görsel efekt (referans repo gerçek Anthropic SDK; biz backend'siz mock).
- Bu şartname referans repo'dan **fikir** aldı, **kod/UI kopyalamadı**: farklı framework (RR7 vs Next.js), farklı editör (CM6 vs Monaco), farklı navigasyon (Rail+Spotlight+CopilotRail vs Island+Dock+Orb), farklı tasarım imzası (tek vurgu+grid vs çok-renk+blob), farklı tipografi (Inter/JBM vs Geist).
- RR7 SPA bazı browser-only kütüphanelerle SSR sırasında sorun çıkarabilir → `window`/`localStorage` erişimini `useEffect`/clientLoader'da tut.
