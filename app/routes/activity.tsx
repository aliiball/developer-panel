import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { API_CALLS_WEEKLY, MODEL_GROWTH } from "~/data/metrics";
import { ACTIVITIES, type ActivityType } from "~/data/activities";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Activity — MetaPanel" }];
}

const FILTERS: { key: ActivityType | "all"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "model", label: "Model" },
  { key: "module", label: "Modül" },
  { key: "migration", label: "Migration" },
  { key: "api", label: "API" },
  { key: "ai", label: "AI" },
];

const chartTip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  },
};

export default function ActivityPage() {
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const filtered = filter === "all" ? ACTIVITIES : ACTIVITIES.filter((a) => a.type === filter);

  return (
    <>
      <PageHeader title="Activity" description="Kullanım grafikleri ve filtrelenebilir aktivite akışı." />
      <PageBody className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">API Çağrıları (haftalık)</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={API_CALLS_WEEKLY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip {...chartTip} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Model Büyümesi</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MODEL_GROWTH}>
                  <defs>
                    <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                  <Tooltip {...chartTip} />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#growth)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Aktivite Akışı</CardTitle>
            <div className="ml-auto flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    filter === f.key ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length ? (
              <FilteredFeed filterKey={filter} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Bu filtrede aktivite yok.</p>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

function FilteredFeed({ filterKey }: { filterKey: ActivityType | "all" }) {
  const items = filterKey === "all" ? ACTIVITIES : ACTIVITIES.filter((a) => a.type === filterKey);
  return (
    <ol className="space-y-1">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/40">
          <Badge variant="secondary" className="w-20 justify-center text-[10px]">{a.type}</Badge>
          <span className="flex-1 truncate text-sm">
            {a.title} <span className="font-mono text-xs text-muted-foreground">{a.target}</span>
          </span>
          <span className="text-[11px] text-muted-foreground">{a.timeAgo} önce</span>
        </li>
      ))}
    </ol>
  );
}
