"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useClientActivity } from "../hooks/use-client-activity";
import { useFaviconStatus } from "../hooks/use-favicon-status";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { parseHostAgentRouteFromPathname } from "../lib/host-routes";
import { usePanelStore } from "../stores/panel-store";
import { CommandCenter } from "./command-center";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { LeftSidebar } from "./left-sidebar";

export function DaemonLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const toggleAgentList = usePanelStore((s) => s.toggleAgentList);
  const toggleFileExplorer = usePanelStore((s) => s.toggleFileExplorer);

  const agentRoute = useMemo(
    () => parseHostAgentRouteFromPathname(pathname),
    [pathname]
  );

  useKeyboardShortcuts({
    enabled: true,
    toggleAgentList,
    selectedAgentId: agentRoute?.agentId,
    toggleFileExplorer,
  });

  useFaviconStatus();
  useClientActivity();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <LeftSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      <CommandCenter />
      <KeyboardShortcutsDialog />
    </div>
  );
}
