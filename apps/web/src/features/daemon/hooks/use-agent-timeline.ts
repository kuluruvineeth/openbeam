"use client";

import { useCallback, useMemo } from "react";
import {
  type AgentTimelineCursorState,
  useSessionStore,
} from "../stores/session-store";

export interface TimelineState {
  cursor: AgentTimelineCursorState | null;
  hasOlderItems: boolean;
  isSynchronized: boolean;
}

export function useAgentTimeline(
  serverId: string | null,
  agentId: string | null
): TimelineState {
  const session = useSessionStore((s) =>
    serverId ? s.sessions[serverId] : undefined
  );

  return useMemo<TimelineState>(() => {
    if (!(session && agentId)) {
      return { cursor: null, hasOlderItems: false, isSynchronized: false };
    }

    const cursor = session.agentTimelineCursor.get(agentId) ?? null;
    const hasOlderItems = cursor !== null && cursor.startSeq > 0;
    const agentGeneration =
      session.agentHistorySyncGeneration.get(agentId) ?? -1;
    const isSynchronized = agentGeneration === session.historySyncGeneration;

    return { cursor, hasOlderItems, isSynchronized };
  }, [session, agentId]);
}

export function useUpdateTimelineCursor(
  serverId: string | null
): (agentId: string, cursor: AgentTimelineCursorState) => void {
  const setAgentTimelineCursor = useSessionStore(
    (s) => s.setAgentTimelineCursor
  );

  return useCallback(
    (agentId: string, cursor: AgentTimelineCursorState) => {
      if (!serverId) {
        return;
      }
      setAgentTimelineCursor(serverId, (prev) => {
        const next = new Map(prev);
        next.set(agentId, cursor);
        return next;
      });
    },
    [serverId, setAgentTimelineCursor]
  );
}

export function useMarkTimelineSynchronized(
  serverId: string | null
): (agentId: string) => void {
  const markAgentHistorySynchronized = useSessionStore(
    (s) => s.markAgentHistorySynchronized
  );

  return useCallback(
    (agentId: string) => {
      if (!serverId) {
        return;
      }
      markAgentHistorySynchronized(serverId, agentId);
    },
    [serverId, markAgentHistorySynchronized]
  );
}
