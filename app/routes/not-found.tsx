import { Link, useLocation } from "react-router";
import { Compass, ArrowLeft, Search } from "lucide-react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { Button } from "~/components/ui/button";
import { useUIStore } from "~/stores/ui-store";

// In-shell 404 for any unmatched URL. Unlike the bare root ErrorBoundary, this
// renders inside the rail/topbar so the user is never stranded.
export default function NotFound() {
  const { pathname } = useLocation();
  const setSpotlight = useUIStore((s) => s.setSpotlight);

  return (
    <>
      <PageHeader title="Sayfa bulunamadı" description={pathname} />
      <PageBody className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Compass className="size-7" />
          </div>
          <div>
            <h2 className="font-mono text-3xl font-semibold">404</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{pathname}</code> bulunamadı.
              Bağlantı taşınmış veya hiç var olmamış olabilir.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" render={<Link to="/" />}>
              <ArrowLeft className="size-4" /> Dashboard
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setSpotlight(true)}>
              <Search className="size-4" /> Sayfa ara (⌘K)
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
