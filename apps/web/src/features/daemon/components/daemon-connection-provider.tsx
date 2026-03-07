"use client";

import type { AgentLifecycleStatus } from "@openbeam/types/services/daemon";
import type {
  AgentSnapshotPayload,
  ProjectPlacementPayload,
  ServerInfoStatusPayload,
  SessionOutboundMessage,
} from "@openbeam/types/services/daemon/messages";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DAEMON_DEFAULT_PORT } from "../constants";
import {
  DaemonConnectionContext,
  type DaemonConnectionContextValue,
  type DaemonConnectionRecord,
  type DaemonConnectionStatus,
} from "../hooks/use-daemon-connection";
import { getOrCreateClientSessionKey } from "../lib/client-session-key";
import {
  buildDefaultEndpoint,
  createDaemonClient,
  type DaemonClient,
} from "../lib/daemon-client";
import { applyStreamEvent } from "../lib/stream-reducer";
import { type Agent, useSessionStore } from "../stores/session-store";

const DEFAULT_SERVER_ID = "local";

function snapshotToAgent(
  serverId: string,
  snap: AgentSnapshotPayload,
  project?: ProjectPlacementPayload
): Agent {
  const updatedAt = new Date(snap.updatedAt);
  return {
    serverId,
    id: snap.id,
    provider: snap.provider,
    status: snap.status,
    createdAt: new Date(snap.createdAt),
    updatedAt,
    lastUserMessageAt: snap.lastUserMessageAt
      ? new Date(snap.lastUserMessageAt)
      : null,
    lastActivityAt: updatedAt,
    capabilities: snap.capabilities,
    currentModeId: snap.currentModeId,
    availableModes: snap.availableModes,
    pendingPermissions: snap.pendingPermissions,
    persistence: snap.persistence,
    runtimeInfo: snap.runtimeInfo,
    lastUsage: snap.lastUsage,
    lastError: snap.lastError,
    title: snap.title,
    cwd: snap.cwd,
    model: snap.model,
    thinkingOptionId: snap.thinkingOptionId,
    requiresAttention: snap.requiresAttention,
    attentionReason: snap.attentionReason ?? null,
    attentionTimestamp: snap.attentionTimestamp
      ? new Date(snap.attentionTimestamp)
      : null,
    archivedAt: snap.archivedAt ? new Date(snap.archivedAt) : null,
    labels: snap.labels,
    projectPlacement: project ?? null,
  };
}

function mapConnectionState(
  wsState: "connecting" | "open" | "closed"
): DaemonConnectionStatus {
  switch (wsState) {
    case "connecting":
      return "connecting";
    case "open":
      return "online";
    case "closed":
      return "offline";
    default:
      return "offline";
  }
}

export function DaemonConnectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [connectionStates, setConnectionStates] = useState<
    Map<string, DaemonConnectionRecord>
  >(() => {
    const map = new Map<string, DaemonConnectionRecord>();
    map.set(DEFAULT_SERVER_ID, {
      daemon: {
        serverId: DEFAULT_SERVER_ID,
        label: "Local",
        endpoint: `ws://localhost:${DAEMON_DEFAULT_PORT}`,
      },
      status: "connecting",
      lastError: null,
      lastOnlineAt: null,
      agentDirectoryStatus: "initial_loading",
      agentDirectoryError: null,
      hasEverLoadedAgentDirectory: false,
    });
    return map;
  });

  const clientRef = useRef<DaemonClient | null>(null);

  const updateConnectionStatus = useCallback(
    (serverId: string, status: DaemonConnectionStatus) => {
      setConnectionStates((prev) => {
        const record = prev.get(serverId);
        if (!record || record.status === status) {
          return prev;
        }
        const next = new Map(prev);
        next.set(serverId, {
          ...record,
          status,
          ...(status === "online"
            ? { lastOnlineAt: new Date().toISOString(), lastError: null }
            : {}),
        });
        return next;
      });
    },
    []
  );

  const handleSessionMessage = useCallback(
    (serverId: string, msg: SessionOutboundMessage) => {
      const store = useSessionStore.getState();

      switch (msg.type) {
        case "agent_update": {
          const { payload } = msg;
          if (payload.kind === "upsert") {
            const agent = snapshotToAgent(
              serverId,
              payload.agent,
              payload.project
            );
            store.setAgents(serverId, (prev) => {
              const next = new Map(prev);
              next.set(agent.id, agent);
              return next;
            });
            store.setAgentLastActivity(agent.id, agent.lastActivityAt);
          } else if (payload.kind === "remove") {
            store.setAgents(serverId, (prev) => {
              if (!prev.has(payload.agentId)) {
                return prev;
              }
              const next = new Map(prev);
              next.delete(payload.agentId);
              return next;
            });
          }
          break;
        }

        case "agent_stream": {
          const { agentId, event, timestamp } = msg.payload;
          const session = store.getSession(serverId);
          if (!session) {
            break;
          }

          const currentTail = session.agentStreamTail.get(agentId) ?? [];
          const currentHead = session.agentStreamHead.get(agentId) ?? [];

          const result = applyStreamEvent({
            tail: currentTail,
            head: currentHead,
            event,
            timestamp: new Date(timestamp),
          });

          if (result.changedTail) {
            store.setAgentStreamTail(serverId, (prev) => {
              const next = new Map(prev);
              next.set(agentId, result.tail);
              return next;
            });
          }

          if (result.changedHead) {
            store.setAgentStreamHead(serverId, (prev) => {
              const next = new Map(prev);
              next.set(agentId, result.head);
              return next;
            });
          }

          store.setAgentLastActivity(agentId, new Date(timestamp));
          break;
        }

        case "agent_status": {
          const { agentId, status } = msg.payload;
          const agentStatus = status as AgentLifecycleStatus;
          store.setAgents(serverId, (prev) => {
            const existing = prev.get(agentId);
            if (!existing || existing.status === agentStatus) {
              return prev;
            }
            const next = new Map(prev);
            next.set(agentId, { ...existing, status: agentStatus });
            return next;
          });
          break;
        }

        case "fetch_agents_response": {
          const agents = new Map<string, Agent>();
          for (const entry of msg.payload.entries) {
            const agent = snapshotToAgent(serverId, entry.agent, entry.project);
            agents.set(agent.id, agent);
          }
          if (process.env.NODE_ENV === "development") {
            console.debug("[daemon] agents loaded:", agents.size);
          }
          store.setAgents(serverId, agents);
          store.setHasHydratedAgents(serverId, true);

          setConnectionStates((prev) => {
            const record = prev.get(serverId);
            if (!record) {
              return prev;
            }
            const next = new Map(prev);
            next.set(serverId, {
              ...record,
              agentDirectoryStatus: "loaded",
              hasEverLoadedAgentDirectory: true,
              agentDirectoryError: null,
            });
            return next;
          });
          break;
        }

        case "status": {
          if (msg.payload.status === "server_info") {
            const info = msg.payload as unknown as ServerInfoStatusPayload;
            store.updateSessionServerInfo(serverId, {
              serverId,
              hostname: info.hostname ?? null,
              version: info.version ?? null,
              capabilities: info.capabilities,
            });
          }
          break;
        }

        default:
          break;
      }
    },
    []
  );

  const refreshAgentDirectory = useCallback((serverId: string) => {
    const client = clientRef.current;
    if (!client || client.state !== "open") {
      return;
    }

    setConnectionStates((prev) => {
      const record = prev.get(serverId);
      if (!record) {
        return prev;
      }
      const next = new Map(prev);
      next.set(serverId, {
        ...record,
        agentDirectoryStatus: record.hasEverLoadedAgentDirectory
          ? "revalidating"
          : "initial_loading",
      });
      return next;
    });

    client.sendSessionMessage({
      type: "fetch_agents_request",
      requestId: crypto.randomUUID(),
    });
  }, []);

  const refreshAllAgentDirectories = useCallback(() => {
    refreshAgentDirectory(DEFAULT_SERVER_ID);
  }, [refreshAgentDirectory]);

  useEffect(() => {
    const endpoint = buildDefaultEndpoint("127.0.0.1", DAEMON_DEFAULT_PORT);
    const serverId = DEFAULT_SERVER_ID;
    const clientSessionKey = getOrCreateClientSessionKey();

    useSessionStore.getState().initializeSession(serverId, null);

    const client = createDaemonClient({
      endpoint,
      clientSessionKey,
      onSessionMessage: (msg) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("[daemon] session msg:", msg.type);
        }
        handleSessionMessage(serverId, msg);
      },
      onStateChange: (state) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("[daemon] ws state:", state);
        }
        const status = mapConnectionState(state);
        updateConnectionStatus(serverId, status);

        if (state === "open") {
          useSessionStore.getState().updateSessionClient(serverId, client);
          refreshAgentDirectory(serverId);
        }
      },
      onError: (err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[daemon] ws error:", err);
        }
        updateConnectionStatus(serverId, "error");
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
      useSessionStore.getState().clearSession(serverId);
    };
  }, [handleSessionMessage, updateConnectionStatus, refreshAgentDirectory]);

  const value = useMemo<DaemonConnectionContextValue>(
    () => ({
      connectionStates,
      isLoading: false,
      refreshAgentDirectory,
      refreshAllAgentDirectories,
    }),
    [connectionStates, refreshAgentDirectory, refreshAllAgentDirectories]
  );

  return (
    <DaemonConnectionContext.Provider value={value}>
      {children}
    </DaemonConnectionContext.Provider>
  );
}
