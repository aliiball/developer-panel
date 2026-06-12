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
  migrations: { value: 23, delta: "son: 2 saat önce", spark: STAT_SPARKS.migrations, to: "/code" },
};
