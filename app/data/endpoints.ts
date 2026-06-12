export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  model: string;
  auto: boolean;
  description: string;
  auth: boolean;
}

// Auto-generated CRUD endpoints per model + a few hand-written ones.
function crud(model: string, base: string): Endpoint[] {
  return [
    { id: `${model}-list`, method: "GET", path: `/api/${base}`, model, auto: true, auth: true, description: `${model} kayıtlarını listele (sayfalı).` },
    { id: `${model}-get`, method: "GET", path: `/api/${base}/:id`, model, auto: true, auth: true, description: `Tek bir ${model} getir.` },
    { id: `${model}-create`, method: "POST", path: `/api/${base}`, model, auto: true, auth: true, description: `Yeni ${model} oluştur.` },
    { id: `${model}-update`, method: "PATCH", path: `/api/${base}/:id`, model, auto: true, auth: true, description: `${model} güncelle.` },
    { id: `${model}-delete`, method: "DELETE", path: `/api/${base}/:id`, model, auto: true, auth: true, description: `${model} sil.` },
  ];
}

export const ENDPOINTS: Endpoint[] = [
  ...crud("Customer", "customers"),
  ...crud("Product", "products"),
  ...crud("Order", "orders"),
  ...crud("Category", "categories"),
  ...crud("BlogPost", "blog-posts"),
  ...crud("Invoice", "invoices"),
  ...crud("Payment", "payments"),
  ...crud("Review", "reviews"),
  ...crud("Coupon", "coupons"),
  // Hand-written / custom endpoints
  { id: "auth-login", method: "POST", path: "/api/auth/login", model: "Auth", auto: false, auth: false, description: "Oturum aç, JWT döndürür." },
  { id: "auth-me", method: "GET", path: "/api/auth/me", model: "Auth", auto: false, auth: true, description: "Aktif kullanıcı." },
];

export const ENDPOINT_COUNT = ENDPOINTS.length;
