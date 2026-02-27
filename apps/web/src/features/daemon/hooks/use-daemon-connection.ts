"use client";

import { createContext, useContext, useMemo } from "react";

export type DaemonConnectionStatus =
  | "connecting"
  | "online"
  | "offline"
  | "error";

export type AgentDirectoryStatus =
  | "initial_loading"
  | "loaded"
  | "revalidating"
  | "error";

export interface DaemonProfile {
  serverId: string;
  label: string;
  endpoint: string;
}

export interface DaemonConnectionRecord {
  daemon: DaemonProfile;
  status: DaemonConnectionStatus;
  lastError: string | null;
  lastOnlineAt: string | null;
  agentDirectoryStatus: AgentDirectoryStatus;
  agentDirectoryError: string | null;
  hasEverLoadedAgentDirectory: boolean;
}

export interface DaemonConnectionContextValue {
  connectionStates: Map<string, DaemonConnectionRecord>;
  isLoading: boolean;
  refreshAgentDirectory: (serverId: string) => void;
  refreshAllAgentDirectories: () => void;
}

const DaemonConnectionContext =
  createContext<DaemonConnectionContextValue | null>(null);

export { DaemonConnectionContext };

export interface ConnectionListEntry {
  serverId: string;
  label: string | null;
  status: DaemonConnectionStatus;
  version: string | null;
}

interface DaemonConnectionsReturn extends DaemonConnectionContextValue {
  connections: ConnectionListEntry[];
}

export function useDaemonConnections(): DaemonConnectionsReturn {
  const ctx = useContext(DaemonConnectionContext);
  if (!ctx) {
    throw new Error(
      "useDaemonConnections must be used within a DaemonConnectionProvider"
    );
  }
  const connections = useMemo(() => {
    const list: ConnectionListEntry[] = [];
    for (const [, record] of ctx.connectionStates) {
      list.push({
        serverId: record.daemon.serverId,
        label: record.daemon.label,
        status: record.status === "online" ? "online" : record.status,
        version: null,
      });
    }
    return list;
  }, [ctx.connectionStates]);

  return { ...ctx, connections };
}

export function useDaemonConnectionStatus(
  serverId: string | null
): DaemonConnectionRecord | null {
  const { connectionStates } = useDaemonConnections();
  return useMemo(() => {
    if (!serverId) {
      return null;
    }
    return connectionStates.get(serverId) ?? null;
  }, [connectionStates, serverId]);
}

export function isDaemonDirectoryLoading(
  record: DaemonConnectionRecord | null
): boolean {
  if (!record) {
    return false;
  }
  return (
    record.agentDirectoryStatus === "initial_loading" ||
    record.agentDirectoryStatus === "revalidating"
  );
}
