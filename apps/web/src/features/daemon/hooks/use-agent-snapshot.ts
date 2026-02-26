"use client";

import { useCallback, useMemo } from "react";
import { type Agent, useSessionStore } from "../stores/session-store";
import type { StreamItem } from "../types";

export interface AgentSnapshot {
  agent: Agent | null;
  streamHead: StreamItem[];
  streamTail: StreamItem[];
  isInitializing: boolean;
  hasTimeline: boolean;
}

export function useAgentSnapshot(
  serverId: string | null,
  agentId: string | null
): AgentSnapshot {
  const session = useSessionStore((s) =>
    serverId ? s.sessions[serverId] : undefined
  );

  return useMemo<AgentSnapshot>(() => {
    if (!(session && agentId)) {
      return {
        agent: null,
        streamHead: [],
        streamTail: [],
        isInitializing: false,
        hasTimeline: false,
      };
    }

    const agent = session.agents.get(agentId) ?? null;
    const streamHead = session.agentStreamHead.get(agentId) ?? [];
    const streamTail = session.agentStreamTail.get(agentId) ?? [];
    const isInitializing = session.initializingAgents.get(agentId) ?? false;
    const hasTimeline = session.agentTimelineCursor.has(agentId);

    return { agent, streamHead, streamTail, isInitializing, hasTimeline };
  }, [session, agentId]);
}

export function useAgentStreamItems(
  serverId: string | null,
  agentId: string | null
): StreamItem[] {
  const { streamHead, streamTail } = useAgentSnapshot(serverId, agentId);

  return useMemo(() => {
    if (streamTail.length === 0 && streamHead.length === 0) {
      return [];
    }
    if (streamHead.length === 0) {
      return streamTail;
    }
    if (streamTail.length === 0) {
      return streamHead;
    }
    return [...streamTail, ...streamHead];
  }, [streamTail, streamHead]);
}

export function useClearAgentStream(
  serverId: string | null
): (agentId: string) => void {
  const setAgentStreamTail = useSessionStore((s) => s.setAgentStreamTail);
  const clearAgentStreamHead = useSessionStore((s) => s.clearAgentStreamHead);

  return useCallback(
    (agentId: string) => {
      if (!serverId) {
        return;
      }
      setAgentStreamTail(serverId, (prev) => {
        const next = new Map(prev);
        next.delete(agentId);
        return next;
      });
      clearAgentStreamHead(serverId, agentId);
    },
    [serverId, setAgentStreamTail, clearAgentStreamHead]
  );
}
