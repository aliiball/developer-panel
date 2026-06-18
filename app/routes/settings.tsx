import { useState } from "react";
import { Link } from "react-router";
import {
  Copy,
  Eye,
  EyeSlash as EyeOff,
  Monitor,
  Moon,
  Sun,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useTheme } from "~/components/shell/ThemeProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Settings — MetaPanel" }];
}

export default function Settings() {
  const { isDark, setDark } = useTheme();
  const [showKey, setShowKey] = useState(false);
  const [streaming, setStreaming] = useState(true);
  const [proactive, setProactive] = useState(true);
  const apiKey = "mp_live_sk_9f2a7c41b8e3d6a0f1c4b7e2";

  return (
    <>
      <PageHeader title="Settings" description="Genel, görünüm, AI Copilot ve geliştirici ayarları." />
      <PageBody>
        <Tabs defaultValue="general" className="max-w-2xl">
          <TabsList className="h-9">
            <TabsTrigger value="general">Genel</TabsTrigger>
            <TabsTrigger value="appearance">Görünüm</TabsTrigger>
            <TabsTrigger value="ai">AI Copilot</TabsTrigger>
            <TabsTrigger value="developer">Geliştirici</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Workspace</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Row label="Workspace adı"><Input defaultValue="Acme Commerce" className="h-8 max-w-xs" /></Row>
                <Row label="Varsayılan dil"><Input defaultValue="Türkçe" className="h-8 max-w-xs" /></Row>
                <Row label="Saat dilimi"><Input defaultValue="Europe/Istanbul" className="h-8 max-w-xs" /></Row>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Tema</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <SchemeOption icon={Moon} label="Koyu" active={isDark} onClick={() => setDark(true)} />
                  <SchemeOption icon={Sun} label="Açık" active={!isDark} onClick={() => setDark(false)} />
                  <SchemeOption icon={Monitor} label="Sistem" active={false} onClick={() => toast.info("Sistem teması (mock)")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Copilot Davranışı</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <ToggleRow label="Streaming yanıtlar" desc="Yanıtları karakter karakter göster." checked={streaming} onChange={setStreaming} />
                <ToggleRow label="Proaktif öneriler" desc="Sayfaya özel AI insight toast'ları." checked={proactive} onChange={setProactive} />
                <Row label="Model"><Input defaultValue="claude-opus-4-8 (mock)" disabled className="h-8 max-w-xs" /></Row>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="developer" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">API Anahtarı (mock)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    className="h-8 font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" className="size-8" onClick={() => setShowKey((s) => !s)}>
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button variant="outline" size="icon" className="size-8" onClick={() => { navigator.clipboard?.writeText(apiKey); toast.success("Kopyalandı"); }}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Birden fazla anahtar, scope, rotate ve revoke için{" "}
                  <Link to="/api-keys" className="text-primary hover:underline">API Keys</Link> sayfasını kullanın.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SchemeOption({ icon: Icon, label, active, onClick }: { icon: typeof Sun; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
        active ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-accent",
      )}
    >
      <Icon className="size-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
