import { Outlet } from "react-router";
import { LeftRail } from "~/components/shell/LeftRail";
import { Topbar } from "~/components/shell/Topbar";
import { FixBar } from "~/components/shell/FixBar";
import { Spotlight } from "~/components/shell/Spotlight";
import { ShortcutSheet } from "~/components/shell/ShortcutSheet";
import { CopilotRail } from "~/components/copilot/CopilotRail";
import { ProactiveTip } from "~/components/copilot/ProactiveTip";
import { ThemeProvider } from "~/components/shell/ThemeProvider";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Toaster } from "~/components/ui/sonner";
import { useGlobalShortcuts } from "~/hooks/use-shortcuts";

export default function Shell() {
  return (
    <ThemeProvider>
      <TooltipProvider delay={200}>
        <ShellInner />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function ShellInner() {
  useGlobalShortcuts();
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <LeftRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <FixBar />
        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
      <CopilotRail />

      {/* Global overlays */}
      <Spotlight />
      <ShortcutSheet />
      <ProactiveTip />
      <Toaster position="bottom-right" />
    </div>
  );
}
