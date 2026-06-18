import { useMemo, useState } from "react";
import {
  Bar, BarChart, Line, LineChart, Pie, PieChart, Cell,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  FloppyDisk as Save,
  ChartBar as BarChart3,
  ChartLine as LineIcon,
  ChartPie as PieIcon,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useSchemaStore } from "~/stores/schema-store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Reports — MetaPanel" }];
}

const METRICS = ["count", "sum", "avg"];
const CHART_TYPES = [
  { key: "bar", icon: BarChart3, label: "Çubuk" },
  { key: "line", icon: LineIcon, label: "Çizgi" },
  { key: "pie", icon: PieIcon, label: "Pasta" },
] as const;
const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const chartTip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

export default function Reports() {
  const models = useSchemaStore((s) => s.models);
  const [model, setModel] = useState("Order");
  const [metric, setMetric] = useState("count");
  const [groupBy, setGroupBy] = useState("status");
  const [chart, setChart] = useState<string>("bar");

  // deterministic mock series seeded from selections
  const data = useMemo(() => {
    const seed = (model + metric + groupBy).length;
    const buckets = ["A", "B", "C", "D", "E"];
    return buckets.map((b, i) => ({ label: `${groupBy}-${b}`, value: ((seed * (i + 3)) % 90) + 10 }));
  }, [model, metric, groupBy]);

  const fields = models.find((m) => m.name === model)?.fields.map((f) => f.name) ?? ["status"];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Özel rapor oluşturucu — model, metrik ve gruplama seç, grafiği gör."
        actions={[{ label: "Raporu Kaydet", icon: Save, variant: "default", onClick: () => toast.success("Rapor kaydedildi (mock)", { description: `${metric}(${model}) by ${groupBy}` }) }]}
      />
      <PageBody className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Builder */}
        <Card className="h-fit">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Yapılandırma</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Model">
              <Select value={model} onValueChange={(v) => v && setModel(v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{models.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Metrik">
              <Select value={metric} onValueChange={(v) => v && setMetric(v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{METRICS.map((m) => <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Grupla">
              <Select value={groupBy} onValueChange={(v) => v && setGroupBy(v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{fields.map((f) => <SelectItem key={f} value={f} className="font-mono text-xs">{f}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Grafik tipi">
              <div className="grid grid-cols-3 gap-1.5">
                {CHART_TYPES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setChart(c.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] transition-colors",
                      chart === c.key ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <c.icon className="size-4" /> {c.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="rounded-lg bg-muted/40 p-2.5 font-mono text-[11px] text-muted-foreground">
              SELECT {metric}(*) FROM {model.toLowerCase()}s GROUP BY {groupBy};
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{metric}({model}) — {groupBy} bazında</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chart === "bar" ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...chartTip} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chart === "line" ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...chartTip} />
                  <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <PieChart>
                  <Tooltip {...chartTip} />
                  <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
