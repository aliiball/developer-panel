// Page-local seed — webhooks teslimat logu için gerçekçi yoğunluk.
// Ortak app/data/expansion.ts'i değiştirmeden zenginleştirir.

export interface DeliveryAttempt {
  n: number;
  status: number;
  at: string;
  ms: number;
  note?: string;
}

export interface DeliveryLog {
  id: string;
  hookId: string;
  event: string;
  /** endpoint url (görsel ipucu) */
  endpoint: string;
  /** son denenen HTTP durum kodu; 0 = bağlantı hatası/timeout */
  status: number;
  /** "2 dk önce" */
  time: string;
  /** toplam süre ms */
  durationMs: number;
  /** kaç deneme yapıldı */
  attempts: DeliveryAttempt[];
  payload: Record<string, unknown>;
  responseBody: string;
}

// Olası webhook event'leri (test gönder + filtreler için).
export const WEBHOOK_EVENTS = [
  "order.created",
  "order.paid",
  "order.refunded",
  "product.updated",
  "customer.created",
  "invoice.created",
  "subscription.canceled",
] as const;

const okResp = '{"received":true}';

export const DELIVERY_LOG: DeliveryLog[] = [
  {
    id: "dl-2041", hookId: "w1", event: "order.paid", endpoint: "https://hooks.acme.com/orders",
    status: 200, time: "2 dk önce", durationMs: 184,
    attempts: [{ n: 1, status: 200, at: "2 dk önce", ms: 184 }],
    payload: { id: "evt_2041", type: "order.paid", data: { orderId: "ord_88123", amount: 1499.9, currency: "TRY", customer: "cus_5521" } },
    responseBody: okResp,
  },
  {
    id: "dl-2040", hookId: "w1", event: "order.created", endpoint: "https://hooks.acme.com/orders",
    status: 200, time: "6 dk önce", durationMs: 221,
    attempts: [{ n: 1, status: 200, at: "6 dk önce", ms: 221 }],
    payload: { id: "evt_2040", type: "order.created", data: { orderId: "ord_88122", items: 3, total: 642.5 } },
    responseBody: okResp,
  },
  {
    id: "dl-2039", hookId: "w2", event: "product.updated", endpoint: "https://api.partner.io/sync",
    status: 200, time: "11 dk önce", durationMs: 312,
    attempts: [{ n: 1, status: 200, at: "11 dk önce", ms: 312 }],
    payload: { id: "evt_2039", type: "product.updated", data: { sku: "TS-CTN-XL", stock: 120, price: 199 } },
    responseBody: okResp,
  },
  {
    id: "dl-2038", hookId: "w4", event: "invoice.created", endpoint: "https://crm.legacy.net/in",
    status: 500, time: "18 dk önce", durationMs: 5120,
    attempts: [
      { n: 1, status: 500, at: "18 dk önce", ms: 4980, note: "Internal Server Error" },
      { n: 2, status: 500, at: "16 dk önce", ms: 5010, note: "Internal Server Error" },
      { n: 3, status: 500, at: "11 dk önce", ms: 5120, note: "retry bütçesi tükendi" },
    ],
    payload: { id: "evt_2038", type: "invoice.created", data: { invoiceId: "inv_7741", amount: 12400, due: "2026-07-01" } },
    responseBody: '{"error":"NullReferenceException at LegacyHandler.cs:184"}',
  },
  {
    id: "dl-2037", hookId: "w1", event: "order.created", endpoint: "https://hooks.acme.com/orders",
    status: 200, time: "24 dk önce", durationMs: 168,
    attempts: [{ n: 1, status: 200, at: "24 dk önce", ms: 168 }],
    payload: { id: "evt_2037", type: "order.created", data: { orderId: "ord_88119", items: 1, total: 89.9 } },
    responseBody: okResp,
  },
  {
    id: "dl-2036", hookId: "w4", event: "invoice.created", endpoint: "https://crm.legacy.net/in",
    status: 503, time: "32 dk önce", durationMs: 8030,
    attempts: [
      { n: 1, status: 0, at: "32 dk önce", ms: 8000, note: "connect timeout (8s)" },
      { n: 2, status: 503, at: "29 dk önce", ms: 30, note: "Service Unavailable" },
    ],
    payload: { id: "evt_2036", type: "invoice.created", data: { invoiceId: "inv_7740", amount: 5600 } },
    responseBody: '503 Service Unavailable',
  },
  {
    id: "dl-2035", hookId: "w2", event: "product.updated", endpoint: "https://api.partner.io/sync",
    status: 200, time: "41 dk önce", durationMs: 298,
    attempts: [
      { n: 1, status: 429, at: "44 dk önce", ms: 40, note: "Too Many Requests" },
      { n: 2, status: 200, at: "41 dk önce", ms: 298 },
    ],
    payload: { id: "evt_2035", type: "product.updated", data: { sku: "MUG-BLK", stock: 0 } },
    responseBody: okResp,
  },
  {
    id: "dl-2034", hookId: "w3", event: "customer.created", endpoint: "https://slack.com/webhook/T0/B1",
    status: 200, time: "1 sa önce", durationMs: 142,
    attempts: [{ n: 1, status: 200, at: "1 sa önce", ms: 142 }],
    payload: { id: "evt_2034", type: "customer.created", data: { customerId: "cus_5522", email: "ada@acme.com" } },
    responseBody: okResp,
  },
  {
    id: "dl-2033", hookId: "w1", event: "order.refunded", endpoint: "https://hooks.acme.com/orders",
    status: 200, time: "1 sa önce", durationMs: 205,
    attempts: [{ n: 1, status: 200, at: "1 sa önce", ms: 205 }],
    payload: { id: "evt_2033", type: "order.refunded", data: { orderId: "ord_88090", amount: 320 } },
    responseBody: okResp,
  },
  {
    id: "dl-2032", hookId: "w4", event: "order.created", endpoint: "https://crm.legacy.net/in",
    status: 401, time: "2 sa önce", durationMs: 96,
    attempts: [{ n: 1, status: 401, at: "2 sa önce", ms: 96, note: "imza doğrulanamadı" }],
    payload: { id: "evt_2032", type: "order.created", data: { orderId: "ord_88061" } },
    responseBody: '{"error":"invalid signature"}',
  },
  {
    id: "dl-2031", hookId: "w2", event: "product.updated", endpoint: "https://api.partner.io/sync",
    status: 200, time: "3 sa önce", durationMs: 277,
    attempts: [{ n: 1, status: 200, at: "3 sa önce", ms: 277 }],
    payload: { id: "evt_2031", type: "product.updated", data: { sku: "HAT-RED", price: 149 } },
    responseBody: okResp,
  },
  {
    id: "dl-2030", hookId: "w1", event: "order.paid", endpoint: "https://hooks.acme.com/orders",
    status: 200, time: "4 sa önce", durationMs: 158,
    attempts: [{ n: 1, status: 200, at: "4 sa önce", ms: 158 }],
    payload: { id: "evt_2030", type: "order.paid", data: { orderId: "ord_88002", amount: 2240 } },
    responseBody: okResp,
  },
  {
    id: "dl-2029", hookId: "w4", event: "invoice.created", endpoint: "https://crm.legacy.net/in",
    status: 200, time: "5 sa önce", durationMs: 410,
    attempts: [
      { n: 1, status: 500, at: "5 sa önce", ms: 4900, note: "Internal Server Error" },
      { n: 2, status: 200, at: "5 sa önce", ms: 410 },
    ],
    payload: { id: "evt_2029", type: "invoice.created", data: { invoiceId: "inv_7720", amount: 980 } },
    responseBody: okResp,
  },
  {
    id: "dl-2028", hookId: "w3", event: "customer.created", endpoint: "https://slack.com/webhook/T0/B1",
    status: 200, time: "6 sa önce", durationMs: 133,
    attempts: [{ n: 1, status: 200, at: "6 sa önce", ms: 133 }],
    payload: { id: "evt_2028", type: "customer.created", data: { customerId: "cus_5510" } },
    responseBody: okResp,
  },
  {
    id: "dl-2027", hookId: "w1", event: "order.created", endpoint: "https://hooks.acme.com/orders",
    status: 200, time: "7 sa önce", durationMs: 191,
    attempts: [{ n: 1, status: 200, at: "7 sa önce", ms: 191 }],
    payload: { id: "evt_2027", type: "order.created", data: { orderId: "ord_87980", total: 55 } },
    responseBody: okResp,
  },
  {
    id: "dl-2026", hookId: "w2", event: "subscription.canceled", endpoint: "https://api.partner.io/sync",
    status: 422, time: "8 sa önce", durationMs: 88,
    attempts: [{ n: 1, status: 422, at: "8 sa önce", ms: 88, note: "Unprocessable Entity" }],
    payload: { id: "evt_2026", type: "subscription.canceled", data: { subId: "sub_311" } },
    responseBody: '{"error":"unknown field: subId"}',
  },
];

// Son 14 günlük başarı oranı (KPI sparkline + insight).
export const SUCCESS_TREND = [97, 96, 98, 99, 95, 91, 88, 90, 94, 97, 98, 96, 95, 96];
export const LATENCY_TREND = [180, 195, 210, 188, 240, 320, 410, 380, 300, 250, 230, 215, 205, 198];
export const VOLUME_TREND = [820, 910, 1040, 980, 1120, 1310, 1290, 1180, 1020, 940, 1010, 1090, 1150, 1240];
