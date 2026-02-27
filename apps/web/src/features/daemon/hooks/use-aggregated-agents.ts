"use client";

import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { type Agent, useSessionStore } from "../stores/session-store";
import type { AgentDirectoryEntry } from "../types";
import { useDaemonConnections } from "./use-daemon-connection";

export interface AggregatedAgent extends AgentDirectoryEntry {
  serverId: string;
  serverLabel: string;
}

export interface AggregatedAgentsResult {
  agents: AggregatedAgent[];
  isLoading: boolean;
  isInitialLoad: boolean;
  isRevalidating: boolean;
  refreshAll: () => void;
}

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

export function useAggregatedAgents(): AggregatedAgentsResult {
  const { connectionStates, refreshAllAgentDirectories } =
    useDaemonConnections();

  const sessionAgents = useSessionStore(
    useShallow((state) => {
      const result: Record<string, Map<string, Agent> | undefined> = {};
      for (const [serverId, session] of Object.entries(state.sessions)) {
        result[serverId] = session.agents;
      }
      return result;
    })
  );

  const refreshAll = useCallback(() => {
    refreshAllAgentDirectories();
  }, [refreshAllAgentDirectories]);

  const result = useMemo(() => {
    const allAgents: AggregatedAgent[] = [];

    for (const [serverId, agents] of Object.entries(sessionAgents)) {
      if (!agents || agents.size === 0) {
        continue;
      }
      const serverLabel =
        connectionStates.get(serverId)?.daemon.label ?? serverId;
      for (const agent of agents.values()) {
        allAgents.push(toAggregatedAgent(agent, serverId, serverLabel));
      }
    }

    allAgents.sort((left, right) => {
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

    const hasAnyData = allAgents.length > 0;
    const isLoading = Array.from(connectionStates.values()).some(
      (connection) =>
        connection.agentDirectoryStatus === "initial_loading" ||
        connection.agentDirectoryStatus === "revalidating"
    );
    const isInitialLoad = isLoading && !hasAnyData;
    const isRevalidating = isLoading && hasAnyData;

    return { agents: allAgents, isLoading, isInitialLoad, isRevalidating };
  }, [sessionAgents, connectionStates]);

  return { ...result, refreshAll };
}
