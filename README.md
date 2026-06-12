# MetaFramework — AI-First Geliştirici Paneli (Prototip)

Drupal / Frappe / Django Admin'i soyutlayan, **geliştirici-odaklı (DX-first)**, **AI-native** bir
metaframework paneli prototipi. Son kullanıcı değil, geliştirici için tasarlandı. Müşteri
özelleştirmelerini — **marka renkleri, custom fields, custom forms, custom modules** — kod üreterek
yönetir; AI kodu gereksiz kılmaz, hızlandırır.

> Yalnızca **frontend**, tıklanabilir prototip. **Backend yok.** Tüm AI çıktıları mock + simüle-streaming
> (`app/lib/ai-mock.ts`). Hiçbir ağ çağrısı yapılmaz. Şartname: [`docs/developer-panel.md`](./docs/developer-panel.md).

## Stack

React Router v7 (framework mode, `ssr:false` SPA) · shadcn/ui (base-nova / Base UI) · Tailwind v4 ·
cmdk · TanStack Table · Recharts · dnd-kit · CodeMirror 6 · Zustand · React Hook Form + Zod · lucide-react.

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # SPA → build/client (+ 404.html fallback)
npm run preview    # üretim build'ini /metapanel/ base'inde önizle
npm run typecheck
```

## Navigasyon imzası (özgün)

- **Sol Rail** — daima görünür ince ikon şeridi, tooltip + aktif vurgu.
- **⌘K Spotlight** — tam-ekran, **iki kolon**: filtrelenen liste (Navigasyon / Eylemler / AI Komutları)
  + sağda canlı önizleme. "AI: …" öğeleri Copilot'a prompt gönderir.
- **Sağ Copilot Rail** — kapanabilir, **bağlam-duyarlı** (her route'a özel ipucu + quick-reply), simüle streaming.
- **⌘1-9** hızlı sayfa geçişi · **?** kısayol paneli · **⌘J** Copilot aç/kapa.
- Sayfa-içi **Action Bar** + proaktif AI insight toast'ları.

## AI-first üç ayak

1. **Doğal dilden üretim** — Copilot'ta çip/serbest metin → simüle streaming → `DiffPreview` (Uygula/Reddet/Alternatif) → Zustand store.
2. **AI-destekli öneri** — şema satırında ✨ tip önerisi; Theme'de WCAG Fail → AI düzeltme.
3. **Dokuya gömülü birleşim** — her sayfada bağlam-duyarlı Copilot Rail + ⌘K AI komutları + proaktif öneriler.

## Sayfalar (34 yüzey)

- **Çekirdek (13):** Dashboard, AI Copilot, Schema (+ `:modelId` dnd alan editörü), ERD, Data Manager,
  Form Builder, Modules, Permissions, Theme, API Explorer, Code Editor, Activity, Settings.
- **Teslimat & Operasyon (6):** Issues (bug tracker + müşteri intake), Roadmap (Kanban + oylama),
  Releases (ortamlar + CI pipeline + rollback), Error Tracking, Feature Flags, Environments & Secrets.
- **Platform (5):** Migrations, Team & Members, API Keys, AI Agent Runs, Notifications.
- **Genişleme (10):** Workflows, Terminal, Media, Email Templates, Reports, Scheduler, Webhooks,
  Logs, Health, Docs.

> Teslimat döngüsü canlı bağlıdır: Error Tracking → Issue oluştur → çözüldü → Releases changelog → AI sürüm notları.

## Dağıtım (GitHub Pages)

`.github/workflows/deploy.yml` `main`'e push'ta çalışır: `npm ci` → `npm run build` →
`index.html`→`404.html` kopyası (derin route fallback) → Pages'e deploy. Subpath iki mekanizmayla çözülür:
**Vite `base: "/developer-panel/"`** (asset prefix) + **React Router koşullu `basename`** (prod'da `/developer-panel/`,
dev'de `/`). `prerender` kullanılmaz — `basename` + `prerender` kombinasyonu RR7 v7.2+'da regresyonlu.

> Repo adı `developer-panel` değilse `vite.config.ts`'teki `base` değerini repo adınızla güncelleyin.
