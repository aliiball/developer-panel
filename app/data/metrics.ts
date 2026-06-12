// Mock time-series used by Dashboard sparklines and the Activity charts.

export interface Point {
  label: string;
  value: number;
}

export const STAT_SPARKS = {
  models: [6, 7, 7, 8, 9, 10, 11, 12].map((v, i) => ({ label: `w${i}`, value: v })),
  modules: [4, 5, 5, 6, 6, 7, 8, 8].map((v, i) => ({ label: `w${i}`, value: v })),
  endpoints: [20, 26, 31, 35, 38, 42, 45, 47].map((v, i) => ({ label: `w${i}`, value: v })),
  migrations: [9, 11, 13, 15, 18, 20, 22, 23].map((v, i) => ({ label: `w${i}`, value: v })),
} satisfies Record<string, Point[]>;

export const API_CALLS_WEEKLY: Point[] = [
  { label: "Pzt", value: 8200 },
  { label: "Sal", value: 9100 },
  { label: "Çar", value: 11800 },
  { label: "Per", value: 10400 },
  { label: "Cum", value: 13600 },
  { label: "Cmt", value: 6100 },
  { label: "Paz", value: 4800 },
];

export const MODEL_GROWTH: Point[] = STAT_SPARKS.models.map((p, i) => ({
  label: `Hafta ${i + 1}`,
  value: p.value,
}));

export const MODULE_USAGE: Point[] = [
  { label: "E-Commerce", value: 42 },
  { label: "Blog", value: 23 },
  { label: "CRM", value: 18 },
  { label: "Payments", value: 11 },
  { label: "Media", value: 6 },
];

export const DASHBOARD_STATS = {
  models: { value: 12, delta: "+2 bu hafta", spark: STAT_SPARKS.models, to: "/schema" },
  modules: { value: 8, delta: "3 aktif", spark: STAT_SPARKS.modules, to: "/modules" },
  endpoints: { value: 47, delta: "auto-generated", spark: STAT_SPARKS.endpoints, to: "/api-explorer" },
  migrations: { value: 23, delta: "son: 2 saat önce", spark: STAT_SPARKS.migrations, to: "/migrations" },
};

// Delivery & operations KPIs.
const DELIVERY_SPARKS = {
  bugs: [2, 3, 5, 4, 6, 5, 4, 4].map((v, i) => ({ label: `w${i}`, value: v })),
  deploys: [1, 0, 2, 1, 3, 1, 2, 2].map((v, i) => ({ label: `w${i}`, value: v })),
  features: [1, 1, 2, 2, 2, 3, 2, 2].map((v, i) => ({ label: `w${i}`, value: v })),
  errors: [320, 410, 380, 520, 610, 480, 540, 470].map((v, i) => ({ label: `w${i}`, value: v })),
} satisfies Record<string, Point[]>;

export const DELIVERY_STATS = {
  openBugs: { value: 4, delta: "2 kritik", spark: DELIVERY_SPARKS.bugs, to: "/issues" },
  pendingDeploys: { value: 2, delta: "staging hazır", spark: DELIVERY_SPARKS.deploys, to: "/releases" },
  building: { value: 2, delta: "roadmap'te", spark: DELIVERY_SPARKS.features, to: "/roadmap" },
  errors: { value: "1.2K", delta: "son 24s olay", spark: DELIVERY_SPARKS.errors, to: "/errors" },
};
