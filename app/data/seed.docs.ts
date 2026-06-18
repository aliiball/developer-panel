// Page-local seed for the Docs (API reference) surface.
// Genişletilmiş kavram bölümleri, çok-dilli kod örnekleri ve endpoint
// meta verisi (parametre/yanıt/değişim geçmişi). Yalnızca docs route'u kullanır.

export type DocLang = "curl" | "node" | "python" | "php";

export interface DocCodeSample {
  lang: DocLang;
  code: string;
}

export interface DocGuide {
  id: string;
  title: string;
  group: "Başlangıç" | "Çekirdek Kavramlar" | "İleri Düzey";
  /** kısa özet (arama + liste) */
  summary: string;
  body: string;
  /** okuma süresi tahmini (dk) */
  readMin: number;
  updated: string;
  /** dil sekmeli kod örneği (varsa) */
  samples?: DocCodeSample[];
}

export const DOC_LANGS: { id: DocLang; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "php", label: "PHP" },
];

// Genişletilmiş rehber bölümleri — DOC_SECTIONS'ı kapsar + ek derinlik.
export const DOC_GUIDES: DocGuide[] = [
  {
    id: "quickstart",
    title: "Hızlı Başlangıç",
    group: "Başlangıç",
    summary: "5 dakikada ilk isteğini at: anahtar al, kimlik doğrula, kaynak çek.",
    body: "API tabanı `https://api.metapanel.dev/v1`. Bir API anahtarı oluştur (Ayarlar → API Anahtarları), `Authorization: Bearer <token>` başlığıyla ilk isteğini at. Tüm yanıtlar JSON döner ve `application/json` içerik tipi taşır.",
    readMin: 3,
    updated: "2 saat önce",
    samples: [
      { lang: "curl", code: 'curl https://api.metapanel.dev/v1/products \\\n  -H "Authorization: Bearer $METAPANEL_KEY"' },
      { lang: "node", code: 'import { MetaPanel } from "@metapanel/sdk";\n\nconst mp = new MetaPanel({ apiKey: process.env.METAPANEL_KEY });\nconst products = await mp.products.list({ pageSize: 20 });\nconsole.log(products.total);' },
      { lang: "python", code: 'from metapanel import MetaPanel\n\nmp = MetaPanel(api_key=os.environ["METAPANEL_KEY"])\nproducts = mp.products.list(page_size=20)\nprint(products.total)' },
      { lang: "php", code: '<?php\n$mp = new MetaPanel\\Client(getenv("METAPANEL_KEY"));\n$products = $mp->products->list(["pageSize" => 20]);\necho $products->total;' },
    ],
  },
  {
    id: "auth",
    title: "Kimlik Doğrulama",
    group: "Başlangıç",
    summary: "Bearer token, kapsam (scope) ve 24 saatlik geçerlilik.",
    body: "Tüm istekler `Authorization: Bearer <token>` başlığı gerektirir. Token'ı `/api/auth/login` ile alın. Token'lar 24 saat geçerlidir; süresi dolanlar 401 döndürür. Anahtarlar kapsam (scope) taşır: `read`, `write`, `admin`.",
    readMin: 2,
    updated: "1 gün önce",
    samples: [
      { lang: "curl", code: 'curl https://api.metapanel.dev/v1/auth/login \\\n  -X POST -H "Content-Type: application/json" \\\n  -d \'{"email":"you@acme.com","password":"••••"}\'' },
      { lang: "node", code: 'const { token } = await mp.auth.login({\n  email: "you@acme.com",\n  password: process.env.PASS,\n});\n// token 24 saat geçerli' },
      { lang: "python", code: 'res = mp.auth.login(email="you@acme.com", password=os.environ["PASS"])\ntoken = res["token"]  # 24 saat' },
      { lang: "php", code: '$res = $mp->auth->login(["email" => "you@acme.com", "password" => $pass]);\n$token = $res->token;' },
    ],
  },
  {
    id: "pagination",
    title: "Sayfalama",
    group: "Çekirdek Kavramlar",
    summary: "page/pageSize parametreleri, { data, total, page } zarfı, maks 100.",
    body: "Liste uçları `?page=1&pageSize=20` parametrelerini kabul eder. Yanıt `{ data, total, page }` zarfı döndürür. Maks pageSize 100'dür. Büyük veri için cursor tabanlı `?after=<id>` da desteklenir.",
    readMin: 2,
    updated: "3 gün önce",
    samples: [
      { lang: "curl", code: 'curl "https://api.metapanel.dev/v1/orders?page=2&pageSize=50" \\\n  -H "Authorization: Bearer $METAPANEL_KEY"' },
      { lang: "node", code: 'let page = 1;\nwhile (true) {\n  const { data, total } = await mp.orders.list({ page, pageSize: 100 });\n  if (page * 100 >= total) break;\n  page++;\n}' },
      { lang: "python", code: 'page = 1\nwhile True:\n    res = mp.orders.list(page=page, page_size=100)\n    if page * 100 >= res.total:\n        break\n    page += 1' },
      { lang: "php", code: '$page = 1;\ndo {\n  $res = $mp->orders->list(["page" => $page, "pageSize" => 100]);\n  $page++;\n} while ($page * 100 < $res->total);' },
    ],
  },
  {
    id: "errors",
    title: "Hata Formatı",
    group: "Çekirdek Kavramlar",
    summary: "{ error: { code, message, details? } }; 4xx istemci, 5xx sunucu.",
    body: "Hatalar `{ error: { code, message, details? } }` biçimindedir. 4xx istemci, 5xx sunucu hatasıdır. `details` alan-bazlı doğrulama mesajları içerir. `code` makine-okur bir tanımlayıcıdır (ör. `validation_failed`, `not_found`).",
    readMin: 2,
    updated: "4 gün önce",
    samples: [
      { lang: "curl", code: '# 422 yanıtı:\n{\n  "error": {\n    "code": "validation_failed",\n    "message": "İstek doğrulanamadı",\n    "details": { "price": "pozitif olmalı" }\n  }\n}' },
      { lang: "node", code: 'try {\n  await mp.products.create({ price: -1 });\n} catch (e) {\n  if (e.code === "validation_failed") console.log(e.details);\n}' },
      { lang: "python", code: 'from metapanel import MetaPanelError\ntry:\n    mp.products.create(price=-1)\nexcept MetaPanelError as e:\n    if e.code == "validation_failed":\n        print(e.details)' },
      { lang: "php", code: 'try {\n  $mp->products->create(["price" => -1]);\n} catch (MetaPanel\\ApiError $e) {\n  if ($e->code === "validation_failed") print_r($e->details);\n}' },
    ],
  },
  {
    id: "rate-limit",
    title: "Hız Limiti",
    group: "İleri Düzey",
    summary: "100 istek/dk/IP, 429 + Retry-After, üstel geri çekilme.",
    body: "Varsayılan 100 istek/dakika/IP. Limit aşılırsa 429 ve `Retry-After` başlığı döner. API Gateway modülünden ayarlanabilir. İstemcilerin üstel geri çekilme (exponential backoff) uygulaması önerilir.",
    readMin: 2,
    updated: "1 hafta önce",
    samples: [
      { lang: "node", code: 'async function withRetry(fn, tries = 5) {\n  for (let i = 0; i < tries; i++) {\n    try { return await fn(); }\n    catch (e) {\n      if (e.status !== 429) throw e;\n      await sleep((e.retryAfter ?? 2 ** i) * 1000);\n    }\n  }\n}' },
      { lang: "python", code: 'for i in range(5):\n    try:\n        return fn()\n    except RateLimited as e:\n        time.sleep(e.retry_after or 2 ** i)' },
    ],
  },
  {
    id: "webhooks",
    title: "Webhook'lar",
    group: "İleri Düzey",
    summary: "Olay POST'ları, X-Signature HMAC-SHA256, 3 yeniden deneme.",
    body: "Olaylar (order.created, order.paid, customer.created …) kayıtlı uç noktalara POST edilir. İmza `X-Signature` başlığında HMAC-SHA256 ile gönderilir. 3 kez yeniden denenir. İmzayı doğrulamadan payload'a güvenmeyin.",
    readMin: 3,
    updated: "5 gün önce",
    samples: [
      { lang: "node", code: 'import crypto from "node:crypto";\n\nfunction verify(req, secret) {\n  const sig = crypto.createHmac("sha256", secret)\n    .update(req.rawBody).digest("hex");\n  return sig === req.headers["x-signature"];\n}' },
      { lang: "python", code: 'import hmac, hashlib\n\ndef verify(raw_body, signature, secret):\n    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()\n    return hmac.compare_digest(expected, signature)' },
      { lang: "php", code: '$expected = hash_hmac("sha256", $rawBody, $secret);\nif (!hash_equals($expected, $_SERVER["HTTP_X_SIGNATURE"])) {\n  http_response_code(401);\n}' },
    ],
  },
  {
    id: "idempotency",
    title: "Idempotency",
    group: "İleri Düzey",
    summary: "Idempotency-Key ile güvenli yeniden deneme; çift kayıt yok.",
    body: "POST isteklerinde `Idempotency-Key` başlığı gönderin. Aynı anahtarla 24 saat içinde gelen tekrar istekler ilk yanıtı döndürür — ağ hatasında güvenle yeniden deneyebilirsiniz. Anahtar başına benzersiz bir UUID kullanın.",
    readMin: 2,
    updated: "6 gün önce",
    samples: [
      { lang: "curl", code: 'curl https://api.metapanel.dev/v1/orders \\\n  -X POST \\\n  -H "Idempotency-Key: 8f3a-uuid" \\\n  -H "Authorization: Bearer $METAPANEL_KEY" \\\n  -d \'{"total": 4200}\'' },
      { lang: "node", code: 'await mp.orders.create(\n  { total: 4200 },\n  { idempotencyKey: crypto.randomUUID() },\n);' },
    ],
  },
];

// Endpoint başına ek meta: parametre, örnek yanıt, son değişim.
export interface EndpointMeta {
  params?: { name: string; type: string; required: boolean; desc: string }[];
  sampleResponse?: string;
  changelog?: { at: string; note: string; tone?: "default" | "primary" | "emerald" | "amber" | "red" }[];
}

export const ENDPOINT_META: Record<string, EndpointMeta> = {
  "Product-list": {
    params: [
      { name: "page", type: "integer", required: false, desc: "Sayfa numarası (1'den başlar)." },
      { name: "pageSize", type: "integer", required: false, desc: "Sayfa boyutu, maks 100." },
      { name: "q", type: "string", required: false, desc: "İsim/SKU üzerinde arama." },
    ],
    sampleResponse: '{\n  "data": [\n    { "id": "prod_142", "name": "Mavi Tişört", "price": 199, "stock": 42 }\n  ],\n  "total": 318,\n  "page": 1\n}',
    changelog: [
      { at: "2 gün önce", note: "`q` arama parametresi eklendi.", tone: "emerald" },
      { at: "3 hafta önce", note: "Varsayılan pageSize 20 → 25 oldu.", tone: "amber" },
    ],
  },
  "Order-create": {
    params: [
      { name: "customerId", type: "string", required: true, desc: "İlişkili müşteri kimliği." },
      { name: "items", type: "array", required: true, desc: "Sipariş kalemleri (productId + qty)." },
      { name: "coupon", type: "string", required: false, desc: "Uygulanacak kupon kodu." },
    ],
    sampleResponse: '{\n  "id": "ord_9f2",\n  "status": "pending",\n  "total": 4200,\n  "createdAt": "2026-06-18T11:02:00Z"\n}',
    changelog: [
      { at: "1 hafta önce", note: "Idempotency-Key desteği eklendi.", tone: "primary" },
    ],
  },
  "Auth-login": {
    params: [
      { name: "email", type: "string", required: true, desc: "Kullanıcı e-postası." },
      { name: "password", type: "string", required: true, desc: "Hesap parolası." },
    ],
    sampleResponse: '{\n  "token": "eyJhbGci…",\n  "expiresIn": 86400,\n  "scope": ["read", "write"]\n}',
    changelog: [
      { at: "1 ay önce", note: "Yanıta `scope` alanı eklendi.", tone: "emerald" },
    ],
  },
};
