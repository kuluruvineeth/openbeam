"use client";

import { useCallback, useMemo } from "react";
import { type Agent, useSessionStore } from "../stores/session-store";
import type {
  AggregatedAgent,
  AggregatedAgentsResult,
} from "./use-aggregated-agents";
import {
  isDaemonDirectoryLoading,
  useDaemonConnectionStatus,
  useDaemonConnections,
} from "./use-daemon-connection";

function toAggregatedAgent(
  source: Agent,
  serverId: string,
  serverLabel: string
): AggregatedAgent {
  return {
    id: source.id,
    serverId,
    serverLabel,
    title: source.title ?? null,
    status: source.status,
    lastActivityAt: source.lastActivityAt,
    cwd: source.cwd,
    provider: source.provider,
    requiresAttention: source.requiresAttention ?? false,
    attentionReason: source.attentionReason ?? null,
    attentionTimestamp: source.attentionTimestamp ?? null,
    archivedAt: source.archivedAt ?? null,
    labels: Object.keys(source.labels),
  };
}

export function useAllAgentsList(options?: {
  serverId?: string | null;
}): AggregatedAgentsResult {
  const { connectionStates, refreshAgentDirectory } = useDaemonConnections();

  const serverId = useMemo(() => {
    const value = options?.serverId;
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : null;
  }, [options?.serverId]);

  const session = useSessionStore((state) =>
    serverId ? state.sessions[serverId] : undefined
  );
  const liveAgents = session?.agents ?? null;
  const connectionRecord = useDaemonConnectionStatus(serverId);

  const refreshAll = useCallback(() => {
    if (!serverId || connectionRecord?.status !== "online") {
      return;
    }
    refreshAgentDirectory(serverId);
  }, [refreshAgentDirectory, serverId, connectionRecord?.status]);

  const agents = useMemo(() => {
    if (!(serverId && liveAgents)) {
      return [];
    }
    const serverLabel =
      connectionStates.get(serverId)?.daemon.label ?? serverId;
    const list: AggregatedAgent[] = [];

    for (const agent of liveAgents.values()) {
      const aggregated = toAggregatedAgent(agent, serverId, serverLabel);
      if (aggregated.archivedAt) {
        continue;
      }
      list.push(aggregated);
    }

    list.sort((left, right) => {
      const leftRunning = left.status === "running";
      const rightRunning = right.status === "running";
      if (leftRunning && !rightRunning) {
        return -1;
      }
      if (!leftRunning && rightRunning) {
        return 1;
      }
      return (
        (right.lastActivityAt?.getTime() ?? 0) -
        (left.lastActivityAt?.getTime() ?? 0)
      );
    });

    return list;
  }, [connectionStates, liveAgents, serverId]);

  const isDirectoryLoading = Boolean(
    serverId && isDaemonDirectoryLoading(connectionRecord)
  );

  return {
    agents,
    isLoading: isDirectoryLoading,
    isInitialLoad: isDirectoryLoading && agents.length === 0,
    isRevalidating: isDirectoryLoading && agents.length > 0,
    refreshAll,
  };
}
