// Page-local seed for the Media library surface (media.tsx).
// Genişletilmiş, gerçekçi metadata: yükleyen, klasör, kullanım sayısı,
// alt-text, son erişim vb. enterprise medya yönetimi için.
import type { MediaItem } from "~/data/expansion";

export interface MediaRecord extends MediaItem {
  /** mantıksal klasör/koleksiyon */
  folder: string;
  /** yükleyen kullanıcı */
  uploadedBy: string;
  /** yüklenme tarihi (ISO) */
  uploadedAt: string;
  /** kaç içerikte referanslanıyor (kullanım) */
  usage: number;
  /** ham bayt boyutu (sıralama/toplam için) */
  bytes: number;
  /** CDN / depolama yolu */
  path: string;
  /** görseller için alt metin (a11y/SEO) */
  alt?: string;
  /** süre (video/audio) */
  duration?: string;
  /** etiketler */
  tags: string[];
  /** yıldızlı/favori */
  starred?: boolean;
}

const KB = 1024;
const MB = 1024 * 1024;

export const MEDIA_RECORDS: MediaRecord[] = [
  { id: "m1", name: "hero-banner.png", type: "image", size: "842 KB", hue: 250, dims: "1920×1080", folder: "Kampanya", uploadedBy: "Ada Yılmaz", uploadedAt: "2026-06-17T09:12:00Z", usage: 7, bytes: 842 * KB, path: "/cdn/campaign/hero-banner.png", alt: "Yaz indirimi ana banner", tags: ["banner", "yaz", "anasayfa"], starred: true },
  { id: "m2", name: "product-01.jpg", type: "image", size: "412 KB", hue: 160, dims: "1200×1200", folder: "Ürünler", uploadedBy: "Mert Kaya", uploadedAt: "2026-06-16T14:30:00Z", usage: 3, bytes: 412 * KB, path: "/cdn/products/product-01.jpg", alt: "Mavi spor ayakkabı önden görünüm", tags: ["ürün", "ayakkabı"] },
  { id: "m3", name: "promo.mp4", type: "video", size: "8.4 MB", hue: 20, dims: "1080p", folder: "Kampanya", uploadedBy: "Ada Yılmaz", uploadedAt: "2026-06-15T11:05:00Z", usage: 2, bytes: 8.4 * MB, path: "/cdn/campaign/promo.mp4", duration: "0:34", tags: ["video", "promo"], starred: true },
  { id: "m4", name: "katalog.pdf", type: "doc", size: "2.1 MB", hue: 0, folder: "Belgeler", uploadedBy: "Selin Demir", uploadedAt: "2026-06-14T08:45:00Z", usage: 1, bytes: 2.1 * MB, path: "/cdn/docs/katalog.pdf", tags: ["katalog", "pdf"] },
  { id: "m5", name: "product-02.jpg", type: "image", size: "388 KB", hue: 190, dims: "1200×1200", folder: "Ürünler", uploadedBy: "Mert Kaya", uploadedAt: "2026-06-14T16:20:00Z", usage: 4, bytes: 388 * KB, path: "/cdn/products/product-02.jpg", alt: "Yeşil sırt çantası", tags: ["ürün", "çanta"] },
  { id: "m6", name: "jingle.mp3", type: "audio", size: "1.2 MB", hue: 300, folder: "Ses", uploadedBy: "Can Aydın", uploadedAt: "2026-06-13T10:00:00Z", usage: 1, bytes: 1.2 * MB, path: "/cdn/audio/jingle.mp3", duration: "0:12", tags: ["ses", "jingle"] },
  { id: "m7", name: "avatar-set.png", type: "image", size: "120 KB", hue: 280, dims: "512×512", folder: "UI", uploadedBy: "Ada Yılmaz", uploadedAt: "2026-06-12T13:15:00Z", usage: 11, bytes: 120 * KB, path: "/cdn/ui/avatar-set.png", alt: "Varsayılan avatar seti", tags: ["ui", "avatar"], starred: true },
  { id: "m8", name: "sözleşme.pdf", type: "doc", size: "640 KB", hue: 0, folder: "Belgeler", uploadedBy: "Selin Demir", uploadedAt: "2026-06-11T09:30:00Z", usage: 0, bytes: 640 * KB, path: "/cdn/docs/sozlesme.pdf", tags: ["sözleşme", "hukuk"] },
  { id: "m9", name: "background.jpg", type: "image", size: "1.5 MB", hue: 210, dims: "2560×1440", folder: "UI", uploadedBy: "Mert Kaya", uploadedAt: "2026-06-10T17:50:00Z", usage: 5, bytes: 1.5 * MB, path: "/cdn/ui/background.jpg", alt: "Soyut gradyan arka plan", tags: ["ui", "arkaplan"] },
  { id: "m10", name: "intro.mp4", type: "video", size: "12.7 MB", hue: 40, dims: "720p", folder: "Kampanya", uploadedBy: "Can Aydın", uploadedAt: "2026-06-09T12:40:00Z", usage: 0, bytes: 12.7 * MB, path: "/cdn/campaign/intro.mp4", duration: "1:08", tags: ["video", "intro"] },
  { id: "m11", name: "logo-dark.png", type: "image", size: "44 KB", hue: 230, dims: "400×120", folder: "Marka", uploadedBy: "Ada Yılmaz", uploadedAt: "2026-06-08T08:00:00Z", usage: 23, bytes: 44 * KB, path: "/cdn/brand/logo-dark.png", alt: "Koyu tema logo", tags: ["marka", "logo"], starred: true },
  { id: "m12", name: "rapor-q2.pdf", type: "doc", size: "980 KB", hue: 0, folder: "Belgeler", uploadedBy: "Selin Demir", uploadedAt: "2026-06-07T15:25:00Z", usage: 2, bytes: 980 * KB, path: "/cdn/docs/rapor-q2.pdf", tags: ["rapor", "finans"] },
  { id: "m13", name: "team-photo.jpg", type: "image", size: "2.3 MB", hue: 140, dims: "3000×2000", folder: "Kurumsal", uploadedBy: "Mert Kaya", uploadedAt: "2026-06-06T11:10:00Z", usage: 1, bytes: 2.3 * MB, path: "/cdn/corp/team-photo.jpg", alt: "Ekip grup fotoğrafı", tags: ["kurumsal", "ekip"] },
  { id: "m14", name: "podcast-ep12.mp3", type: "audio", size: "34.6 MB", hue: 320, folder: "Ses", uploadedBy: "Can Aydın", uploadedAt: "2026-06-05T09:55:00Z", usage: 1, bytes: 34.6 * MB, path: "/cdn/audio/podcast-ep12.mp3", duration: "42:18", tags: ["podcast", "ses"] },
  { id: "m15", name: "icon-sprite.png", type: "image", size: "78 KB", hue: 260, dims: "1024×1024", folder: "UI", uploadedBy: "Ada Yılmaz", uploadedAt: "2026-06-04T14:00:00Z", usage: 18, bytes: 78 * KB, path: "/cdn/ui/icon-sprite.png", alt: "İkon sprite sayfası", tags: ["ui", "ikon"], starred: true },
  { id: "m16", name: "demo-walkthrough.mp4", type: "video", size: "48.2 MB", hue: 60, dims: "1080p", folder: "Eğitim", uploadedBy: "Selin Demir", uploadedAt: "2026-06-03T10:30:00Z", usage: 6, bytes: 48.2 * MB, path: "/cdn/edu/demo-walkthrough.mp4", duration: "5:47", tags: ["eğitim", "video"] },
  { id: "m17", name: "fatura-sablon.pdf", type: "doc", size: "210 KB", hue: 0, folder: "Belgeler", uploadedBy: "Selin Demir", uploadedAt: "2026-06-02T16:45:00Z", usage: 9, bytes: 210 * KB, path: "/cdn/docs/fatura-sablon.pdf", tags: ["fatura", "şablon"] },
  { id: "m18", name: "social-cover.png", type: "image", size: "560 KB", hue: 170, dims: "1500×500", folder: "Sosyal Medya", uploadedBy: "Mert Kaya", uploadedAt: "2026-06-01T12:00:00Z", usage: 4, bytes: 560 * KB, path: "/cdn/social/social-cover.png", alt: "Sosyal medya kapak görseli", tags: ["sosyal", "kapak"] },
];

/** insan-okur boyut */
export function fmtBytes(b: number): string {
  if (b < KB) return `${b} B`;
  if (b < MB) return `${(b / KB).toFixed(0)} KB`;
  if (b < 1024 * MB) return `${(b / MB).toFixed(1)} MB`;
  return `${(b / (1024 * MB)).toFixed(2)} GB`;
}

export const MEDIA_FOLDERS = [
  "Kampanya",
  "Ürünler",
  "Belgeler",
  "UI",
  "Marka",
  "Ses",
  "Kurumsal",
  "Eğitim",
  "Sosyal Medya",
] as const;
