import type { SchemaField, SchemaModel, FieldType } from "~/stores/schema-store";
import type { BrandColors } from "~/stores/theme-store";
import type { FormFieldDef, FormFieldKind } from "~/stores/form-store";

// ── Preview payloads ──────────────────────────────────────────────
// Each AI response may carry a typed, applyable preview. The DiffPreview
// component renders by `kind` and "Apply" routes to the right store.

export interface AIModelDraft {
  name: string;
  tableName: string;
  description?: string;
  fields: Omit<SchemaField, "id">[];
}

export interface AIEndpointDraft {
  method: string;
  path: string;
  description: string;
}

export type AIPreview =
  | { kind: "models"; title: string; models: AIModelDraft[] }
  | { kind: "fields"; title: string; targetModel?: string; fields: Omit<SchemaField, "id">[] }
  | { kind: "palette"; title: string; colors: Partial<BrandColors>; note?: string }
  | { kind: "endpoints"; title: string; endpoints: AIEndpointDraft[] }
  | { kind: "form"; title: string; fields: Omit<FormFieldDef, "id">[] }
  | { kind: "permissions"; title: string; roleName: string; permissions: string[] }
  | { kind: "code"; title: string; language: string; code: string }
  | { kind: "triage"; title: string; items: { issueId: string; severity: string; duplicateOf?: string }[] }
  | { kind: "release-notes"; title: string; version: string; markdown: string };

export interface AIResponse {
  text: string;
  preview?: AIPreview;
  /** rough token count to drive streaming pacing */
  thinkingMs?: number;
}

const f = (
  name: string,
  type: FieldType,
  extra: Partial<Omit<SchemaField, "id" | "name" | "type">> = {},
): Omit<SchemaField, "id"> => ({
  name,
  type,
  required: extra.required ?? false,
  unique: extra.unique ?? false,
  indexed: extra.indexed ?? false,
  ...extra,
});

const ff = (
  kind: FormFieldKind,
  label: string,
  extra: Partial<FormFieldDef> = {},
): Omit<FormFieldDef, "id"> => ({ kind, label, ...extra });

// ── Canned generators ─────────────────────────────────────────────

function blogModule(): AIResponse {
  return {
    text:
      "Blog modülü için 3 model hazırladım: **BlogPost**, **Category** ve **Tag**. " +
      "BlogPost başlık, slug, gövde ve yayın tarihi içeriyor; Category hiyerarşik, Tag çoktan-çoğa. " +
      "Aşağıdaki önizlemeyi uygulayabilirsin.",
    preview: {
      kind: "models",
      title: "Blog modülü — 3 model",
      models: [
        {
          name: "BlogPost",
          tableName: "blog_posts",
          description: "Blog içerikleri.",
          fields: [
            f("title", "string", { required: true, indexed: true }),
            f("slug", "string", { required: true, unique: true, indexed: true }),
            f("body", "text", { required: true }),
            f("excerpt", "text"),
            f("publishedAt", "date", { indexed: true }),
            f("category", "relation", { indexed: true, relationModel: "Category" }),
          ],
        },
        {
          name: "Category",
          tableName: "categories",
          description: "İçerik kategorileri (hiyerarşik).",
          fields: [
            f("name", "string", { required: true, unique: true, indexed: true }),
            f("slug", "string", { required: true, unique: true }),
            f("parent", "relation", { relationModel: "Category" }),
          ],
        },
        {
          name: "Tag",
          tableName: "tags",
          description: "İçerik etiketleri.",
          fields: [f("label", "string", { required: true, unique: true, indexed: true })],
        },
      ],
    },
  };
}

function ecommerceSchema(): AIResponse {
  return {
    text:
      "E-ticaret çekirdeği için **Product**, **Order**, **OrderItem** ve **Category** modellerini " +
      "ilişkileriyle birlikte ürettim. Order → OrderItem bire-çok, OrderItem → Product çoka-bir.",
    preview: {
      kind: "models",
      title: "E-ticaret şeması — 4 model",
      models: [
        {
          name: "Product",
          tableName: "products",
          fields: [
            f("title", "string", { required: true, indexed: true }),
            f("slug", "string", { required: true, unique: true }),
            f("price", "number", { required: true, validation: "min:0" }),
            f("stock", "number", { required: true, defaultValue: "0" }),
            f("category", "relation", { relationModel: "Category", indexed: true }),
          ],
        },
        {
          name: "Order",
          tableName: "orders",
          fields: [
            f("reference", "string", { required: true, unique: true, indexed: true }),
            f("status", "enum", { required: true, enumValues: ["pending", "paid", "shipped", "delivered"], defaultValue: "pending" }),
            f("total", "number", { required: true }),
            f("placedAt", "date", { required: true, indexed: true }),
          ],
        },
        {
          name: "OrderItem",
          tableName: "order_items",
          fields: [
            f("order", "relation", { required: true, relationModel: "Order", indexed: true }),
            f("product", "relation", { required: true, relationModel: "Product", indexed: true }),
            f("quantity", "number", { required: true, defaultValue: "1" }),
            f("unitPrice", "number", { required: true }),
          ],
        },
        {
          name: "Category",
          tableName: "categories",
          fields: [
            f("name", "string", { required: true, unique: true, indexed: true }),
            f("slug", "string", { required: true, unique: true }),
          ],
        },
      ],
    },
  };
}

function palette(): AIResponse {
  return {
    text:
      "WCAG AA hedefiyle indigo tabanlı bir marka paleti hazırladım. Primary/secondary metin " +
      "kontrastı 4.5:1 üzerinde; accent büyük metin için uygun. Önizleyip uygula.",
    preview: {
      kind: "palette",
      title: "Marka paleti — WCAG AA",
      note: "Tüm renkler koyu zeminde AA metin kontrastı sağlar.",
      colors: {
        primary: "#6366f1",
        secondary: "#a855f7",
        accent: "#22d3ee",
        success: "#34d399",
        warning: "#fbbf24",
        destructive: "#f87171",
      },
    },
  };
}

function crudEndpoints(model = "Product", base = "products"): AIResponse {
  return {
    text: `**${model}** modeli için 5 standart CRUD endpoint'i üretildi. Hepsi auth gerektiriyor ve sayfalama destekliyor.`,
    preview: {
      kind: "endpoints",
      title: `${model} — CRUD endpoint'leri`,
      endpoints: [
        { method: "GET", path: `/api/${base}`, description: `${model} listele (sayfalı, filtreli).` },
        { method: "GET", path: `/api/${base}/:id`, description: `Tek ${model} getir.` },
        { method: "POST", path: `/api/${base}`, description: `Yeni ${model} oluştur.` },
        { method: "PATCH", path: `/api/${base}/:id`, description: `${model} güncelle.` },
        { method: "DELETE", path: `/api/${base}/:id`, description: `${model} sil.` },
      ],
    },
  };
}

function contactForm(): AIResponse {
  return {
    text: "İletişim formu için 4 alan hazırladım: ad, e-posta, konu ve mesaj. E-posta alanına doğrulama ekledim.",
    preview: {
      kind: "form",
      title: "İletişim formu",
      fields: [
        ff("text", "Ad Soyad", { required: true, placeholder: "Adınız" }),
        ff("email", "E-posta", { required: true, placeholder: "ornek@mail.com", validation: "email" }),
        ff("select", "Konu", { options: ["Genel", "Destek", "Satış"], required: true }),
        ff("textarea", "Mesaj", { required: true, placeholder: "Mesajınız…" }),
      ],
    },
  };
}

function signupForm(): AIResponse {
  return {
    text: "Kayıt formu için kullanıcı adı, e-posta, şifre ve KVKK onayı alanlarını ürettim.",
    preview: {
      kind: "form",
      title: "Kayıt formu",
      fields: [
        ff("text", "Kullanıcı adı", { required: true }),
        ff("email", "E-posta", { required: true, validation: "email" }),
        ff("text", "Şifre", { required: true, helpText: "En az 8 karakter" }),
        ff("checkbox", "KVKK metnini okudum", { required: true }),
      ],
    },
  };
}

function addFields(targetModel?: string): AIResponse {
  return {
    text: `${targetModel ?? "Seçili model"} için **price** ve **stock** alanlarını öneriyorum. price sayısal ve min:0 doğrulamalı, stock varsayılan 0.`,
    preview: {
      kind: "fields",
      title: "Önerilen alanlar",
      targetModel,
      fields: [
        f("price", "number", { required: true, validation: "min:0" }),
        f("stock", "number", { required: true, defaultValue: "0", indexed: true }),
      ],
    },
  };
}

function seoFields(targetModel?: string): AIResponse {
  return {
    text: `${targetModel ?? "Model"} için SEO alanları: metaTitle, metaDescription ve canonicalUrl.`,
    preview: {
      kind: "fields",
      title: "SEO alanları",
      targetModel,
      fields: [
        f("metaTitle", "string"),
        f("metaDescription", "text"),
        f("canonicalUrl", "url"),
      ],
    },
  };
}

function permissionSuggest(roleName = "Editor"): AIResponse {
  return {
    text: `**${roleName}** rolü için makul bir izin seti öneriyorum: içerik okuma/yazma, modül görüntüleme, tema okuma. Silme ve ayar yönetimi hariç.`,
    preview: {
      kind: "permissions",
      title: `${roleName} — önerilen izinler`,
      roleName,
      permissions: [
        "models.read",
        "modules.read",
        "data.read",
        "data.write",
        "data.export",
        "theme.read",
        "settings.read",
      ],
    },
  };
}

function codeExplain(): AIResponse {
  return {
    text: "İşte seçili modelden üretilen migration. `up()` tabloyu indekslerle oluşturur, `down()` geri alır.",
    preview: {
      kind: "code",
      title: "003_add_orders.ts",
      language: "typescript",
      code: [
        "export async function up(db: Kysely<DB>) {",
        "  await db.schema",
        "    .createTable('orders')",
        "    .addColumn('id', 'serial', (c) => c.primaryKey())",
        "    .addColumn('reference', 'varchar(32)', (c) => c.unique().notNull())",
        "    .addColumn('status', 'varchar(16)', (c) => c.defaultTo('pending'))",
        "    .addColumn('total', 'numeric', (c) => c.notNull())",
        "    .addColumn('placed_at', 'timestamptz', (c) => c.notNull())",
        "    .execute();",
        "  await db.schema.createIndex('orders_placed_at_idx')",
        "    .on('orders').column('placed_at').execute();",
        "}",
        "",
        "export async function down(db: Kysely<DB>) {",
        "  await db.schema.dropTable('orders').execute();",
        "}",
      ].join("\n"),
    },
  };
}

function triageSuggest(): AIResponse {
  return {
    text: "Açık hata raporlarını önem derecesine göre triyaj ettim ve bir olası kopya buldum.",
    preview: {
      kind: "triage",
      title: "Triyaj önerileri",
      items: [
        { issueId: "BUG-142", severity: "critical" },
        { issueId: "BUG-126", severity: "high", duplicateOf: "BUG-118" },
      ],
    },
  };
}

function releaseNotes(): AIResponse {
  return {
    text: "Son deploy'a giren hata düzeltmeleri ve özelliklerden sürüm notlarını oluşturdum.",
    preview: {
      kind: "release-notes",
      title: "Sürüm Notları",
      version: "v1.9.0",
      markdown: [
        "## v1.9.0",
        "",
        "### Yeni Özellikler",
        "- Toplu ürün içe aktarma (CSV) — FEAT-54",
        "",
        "### Düzeltmeler",
        "- Order.placedAt filtresi hızlandırıldı — BUG-138",
        "- Sepette kuponun iki kez uygulanması giderildi — BUG-142",
      ].join("\n"),
    },
  };
}

// ── Router ────────────────────────────────────────────────────────

export function getMockAIResponse(
  prompt: string,
  context?: { model?: string; route?: string },
): AIResponse {
  const p = prompt.toLowerCase();
  const has = (...words: string[]) => words.some((w) => p.includes(w));

  let res: AIResponse;
  if (has("blog")) res = blogModule();
  else if (has("e-ticaret", "eticaret", "ecommerce", "e-commerce", "sipariş şema")) res = ecommerceSchema();
  else if (has("palet", "renk", "wcag", "kontrast", "tema")) res = palette();
  else if (has("seo")) res = seoFields(context?.model);
  else if (has("fiyat", "stok", "alan ekle", "alan öner")) res = addFields(context?.model);
  // ── Delivery & Operations ──
  else if (has("triyaj", "triage", "hata raporu")) res = triageSuggest();
  else if (has("sürüm not", "release note", "changelog", "release")) res = releaseNotes();
  else if (has("kümele", "cluster", "birleştir")) res = { text: "Benzer özellik isteklerini iki temaya kümeledim: **Yerelleştirme** (FEAT-49) ve **Webhook güvenliği** (FEAT-61). İlk kümeyi tek epic altında birleştirmeyi öneririm." };
  else if (has("kök neden", "hata analiz") || (has("analiz") && context?.route === "/errors")) res = { text: "Bu hata büyük olasılıkla kupon uygulanırken `null` bir sipariş toplamından kaynaklanıyor. `OrderService.applyCoupon` içinde guard önerilir. Bağlantılı: **BUG-142**." };
  else if (has("flag")) res = { text: "`subscription_billing` flag'i %0 rollout'ta ve bağlı özellik henüz **building**. `new_checkout_ui` %100'de ve stabil. Riskli bir tam-açık flag görünmüyor." };
  else if (has("ortam değişken", "secret", "sızab", "env değişken")) res = { text: "prod ortamında `STRIPE_SECRET_KEY` 1 aydır rotate edilmemiş — yenilemeniz önerilir. `DEBUG=true` yalnızca dev'de mevcut, doğru. Eksik kritik değişken bulamadım." };
  else if (has("anahtar", "api key")) res = { text: "1 anahtar (**Eski entegrasyon**) 3 aydır kullanılmıyor — revoke önerilir. **CI pipeline** anahtarı `deploy` scope'una sahip; gerçekten gerekli mi gözden geçirin." };
  // ── Build/data ──
  else if (has("endpoint", "crud", "api")) res = crudEndpoints();
  else if (has("kayıt", "signup", "register")) res = signupForm();
  else if (has("iletişim", "contact", "form")) res = contactForm();
  else if (has("izin", "permission", "rol")) res = permissionSuggest();
  else if (has("migration", "kod", "code", "açıkla")) res = codeExplain();
  else {
    res = {
      text:
        "Bunu birkaç şekilde yorumlayabilirim. Daha net olmak gerekirse: şema mı, modül mü, form mu, " +
        "yoksa renk paleti mi üreteyim? Örnek: \"e-ticaret şeması oluştur\" ya da \"WCAG AA palet üret\".",
    };
  }

  // crude pacing: ~12ms/char, capped
  res.thinkingMs = Math.min(1400, 300 + res.text.length * 4);
  return res;
}

// Alternative phrasing for the "Alternatif üret" action.
export function getAlternative(prompt: string, context?: { model?: string }): AIResponse {
  const base = getMockAIResponse(prompt, context);
  return { ...base, text: "Alternatif bir yaklaşım:\n\n" + base.text };
}
