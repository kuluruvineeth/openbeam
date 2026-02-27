"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useSessionStore } from "../stores/session-store";

export interface ArchiveAgentInput {
  serverId: string;
  agentId: string;
}

type ArchiveAgentPendingState = Record<string, true>;

let pendingState: ArchiveAgentPendingState = {};
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ArchiveAgentPendingState {
  return pendingState;
}

function toArchiveKey(input: ArchiveAgentInput): string {
  const serverId = input.serverId.trim();
  const agentId = input.agentId.trim();
  if (!(serverId && agentId)) {
    return "";
  }
  return `${serverId}:${agentId}`;
}

function setArchivingState(
  input: ArchiveAgentInput,
  isArchiving: boolean
): void {
  const key = toArchiveKey(input);
  if (!key) {
    return;
  }

  if (isArchiving) {
    if (pendingState[key]) {
      return;
    }
    pendingState = { ...pendingState, [key]: true };
  } else {
    if (!pendingState[key]) {
      return;
    }
    const next = { ...pendingState };
    delete next[key];
    pendingState = next;
  }
  emitChange();
}

function markAgentArchivedInStore(
  input: ArchiveAgentInput & { archivedAt: string }
): void {
  const archivedAt = new Date(input.archivedAt);
  if (Number.isNaN(archivedAt.getTime())) {
    return;
  }

  const setAgents = useSessionStore.getState().setAgents;
  setAgents(input.serverId, (prev) => {
    const existing = prev.get(input.agentId);
    if (!existing) {
      return prev;
    }
    if (
      existing.archivedAt &&
      existing.archivedAt.getTime() === archivedAt.getTime()
    ) {
      return prev;
    }
    const next = new Map(prev);
    next.set(input.agentId, {
      ...existing,
      archivedAt,
    });
    return next;
  });
}

export function clearArchiveAgentPending(input: ArchiveAgentInput): void {
  setArchivingState(input, false);
}

export function useArchiveAgent() {
  const pending = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const archiveAgent = useCallback(
    async (input: ArchiveAgentInput) => {
      const key = toArchiveKey(input);
      if (!key || pending[key]) {
        return;
      }

      setArchivingState(input, true);

      try {
        const client =
          useSessionStore.getState().sessions[input.serverId]?.client ?? null;
        if (
          !client ||
          typeof client !== "object" ||
          !("archiveAgent" in client) ||
          typeof (client as Record<string, unknown>).archiveAgent !== "function"
        ) {
          throw new Error("Daemon client not available");
        }

        const result = await (
          client as {
            archiveAgent: (id: string) => Promise<{ archivedAt: string }>;
          }
        ).archiveAgent(input.agentId);
        markAgentArchivedInStore({
          serverId: input.serverId,
          agentId: input.agentId,
          archivedAt: result.archivedAt,
        });
      } finally {
        setArchivingState(input, false);
      }
    },
    [pending]
  );

  const isArchivingAgent = useCallback(
    (input: ArchiveAgentInput): boolean => {
      const key = toArchiveKey(input);
      if (!key) {
        return false;
      }
      return Boolean(pending[key]);
    },
    [pending]
  );

  return {
    archiveAgent,
    isArchivingAgent,
  };
}
