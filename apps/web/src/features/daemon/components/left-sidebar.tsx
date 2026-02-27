"use client";

import { Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  type ConnectionListEntry,
  useDaemonConnections,
} from "../hooks/use-daemon-connection";
import {
  buildDaemonAgentDetailRoute,
  buildDaemonAgentsRoute,
  buildDaemonSettingsRoute,
  daemonNavigate,
  parseServerIdFromPathname,
} from "../lib/host-routes";
import { usePanelStore } from "../stores/panel-store";
import { ConnectionStatusIndicator } from "./connection-status-indicator";
import { SidebarAgentList } from "./sidebar-agent-list";

const SIDEBAR_WIDTH = 260;

function HostSelector({
  connections,
  activeServerId,
  onSelect,
}: {
  connections: ConnectionListEntry[];
  activeServerId: string | null;
  onSelect: (serverId: string) => void;
}) {
  if (connections.length <= 1) {
    const connection = connections[0];
    if (!connection) {
      return null;
    }
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="truncate font-medium text-foreground text-xs">
          {connection.label ?? "Local"}
        </span>
        <ConnectionStatusIndicator connected={connection.status === "online"} />
      </div>
    );
  }

  return (
    <select
      className="h-7 w-full rounded-sm border border-border/40 bg-transparent px-2 text-foreground text-xs"
      onChange={(e) => onSelect(e.target.value)}
      value={activeServerId ?? ""}
    >
      {connections.map((c) => (
        <option key={c.serverId} value={c.serverId}>
          {c.label ?? c.serverId}
        </option>
      ))}
    </select>
  );
}

export function LeftSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = usePanelStore((s) => s.sidebar.agentListOpen);
  const { connections } = useDaemonConnections();

  const activeServerId = useMemo(
    () =>
      parseServerIdFromPathname(pathname) ?? connections[0]?.serverId ?? null,
    [connections, pathname]
  );

  const handleNewAgent = useCallback(() => {
    if (!activeServerId) {
      return;
    }
    daemonNavigate(router, buildDaemonAgentDetailRoute(activeServerId, "new"));
  }, [activeServerId, router]);

  const handleAllAgents = useCallback(() => {
    if (!activeServerId) {
      return;
    }
    daemonNavigate(router, buildDaemonAgentsRoute(activeServerId));
  }, [activeServerId, router]);

  const handleSettings = useCallback(() => {
    if (!activeServerId) {
      return;
    }
    daemonNavigate(router, buildDaemonSettingsRoute(activeServerId));
  }, [activeServerId, router]);

  const handleSelectHost = useCallback(
    (serverId: string) => {
      daemonNavigate(router, buildDaemonAgentDetailRoute(serverId, "new"));
    },
    [router]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      className="flex shrink-0 flex-col border-border/40 border-r bg-background"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="flex items-center justify-between border-border/30 border-b px-3 py-2">
        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Agents
        </span>
        <Button
          className="size-6"
          onClick={handleNewAgent}
          size="icon"
          variant="ghost"
        >
          <Icons.Plus className="size-3.5" />
        </Button>
      </div>

      {activeServerId ? (
        <SidebarAgentList
          onNewAgent={handleNewAgent}
          serverId={activeServerId}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
          No host connected
        </div>
      )}

      <div className="flex items-center gap-1 border-border/30 border-t px-2 py-1.5">
        <HostSelector
          activeServerId={activeServerId}
          connections={connections}
          onSelect={handleSelectHost}
        />
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            className="size-6"
            onClick={handleAllAgents}
            size="icon"
            title="All agents"
            variant="ghost"
          >
            <Icons.Users className="size-3.5" />
          </Button>
          <Button
            className="size-6"
            onClick={handleSettings}
            size="icon"
            title="Settings"
            variant="ghost"
          >
            <Icons.Settings className="size-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
