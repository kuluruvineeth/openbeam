"use client";

import type {
  AgentCapabilityFlags,
  AgentLifecycleStatus,
  AgentMode,
  AgentPermissionRequest,
  AgentPersistenceHandle,
  AgentProvider,
  AgentRuntimeInfo,
  AgentUsage,
} from "@openbeam/types/services/daemon";
import type {
  ProjectPlacementPayload,
  ServerCapabilities,
} from "@openbeam/types/services/daemon/messages";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  AgentDirectoryEntry,
  PendingPermission,
  StreamItem,
} from "../types";

export type MessageEntry =
  | {
      type: "user";
      id: string;
      timestamp: number;
      message: string;
    }
  | {
      type: "assistant";
      id: string;
      timestamp: number;
      message: string;
    }
  | {
      type: "activity";
      id: string;
      timestamp: number;
      activityType: "system" | "info" | "success" | "error";
      message: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "artifact";
      id: string;
      timestamp: number;
      artifactId: string;
      artifactType: string;
      title: string;
    }
  | {
      type: "tool_call";
      id: string;
      timestamp: number;
      toolName: string;
      args: unknown | null;
      result?: unknown | null;
      error?: unknown | null;
      status: "executing" | "completed" | "failed";
    };

export interface Agent {
  serverId: string;
  id: string;
  provider: AgentProvider;
  status: AgentLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  lastUserMessageAt: Date | null;
  lastActivityAt: Date;
  capabilities: AgentCapabilityFlags;
  currentModeId: string | null;
  availableModes: AgentMode[];
  pendingPermissions: AgentPermissionRequest[];
  persistence: AgentPersistenceHandle | null;
  runtimeInfo?: AgentRuntimeInfo;
  lastUsage?: AgentUsage;
  lastError?: string | null;
  title: string | null;
  cwd: string;
  model: string | null;
  thinkingOptionId?: string | null;
  requiresAttention?: boolean;
  attentionReason?: "finished" | "error" | "permission" | null;
  attentionTimestamp?: Date | null;
  archivedAt?: Date | null;
  labels: Record<string, string>;
  projectPlacement?: ProjectPlacementPayload | null;
}

export type ExplorerEntryKind = "file" | "directory";
export type ExplorerFileKind = "text" | "image" | "binary";
export type ExplorerEncoding = "utf-8" | "base64" | "none";

export interface ExplorerEntry {
  name: string;
  path: string;
  kind: ExplorerEntryKind;
  size: number;
  modifiedAt: string;
}

export interface ExplorerFile {
  path: string;
  kind: ExplorerFileKind;
  encoding: ExplorerEncoding;
  content?: string;
  mimeType?: string;
  size: number;
  modifiedAt: string;
}

interface ExplorerDirectory {
  path: string;
  entries: ExplorerEntry[];
}

interface ExplorerRequestState {
  path: string;
  mode: "list" | "file";
}

export interface AgentFileExplorerState {
  directories: Map<string, ExplorerDirectory>;
  files: Map<string, ExplorerFile>;
  isLoading: boolean;
  lastError: string | null;
  pendingRequest: ExplorerRequestState | null;
  currentPath: string;
  history: string[];
  lastVisitedPath: string;
  selectedEntryPath: string | null;
}

export type DaemonServerInfo = {
  serverId: string;
  hostname: string | null;
  version: string | null;
  capabilities?: ServerCapabilities;
};

export interface AgentTimelineCursorState {
  epoch: string;
  startSeq: number;
  endSeq: number;
}

type QueuedMessage = {
  id: string;
  text: string;
  images?: Array<{ uri: string; mimeType: string }>;
};

export interface SessionState {
  serverId: string;
  client: unknown;
  serverInfo: DaemonServerInfo | null;
  hasHydratedAgents: boolean;
  isPlayingAudio: boolean;
  focusedAgentId: string | null;
  messages: MessageEntry[];
  currentAssistantMessage: string;
  agentStreamTail: Map<string, StreamItem[]>;
  agentStreamHead: Map<string, StreamItem[]>;
  agentTimelineCursor: Map<string, AgentTimelineCursorState>;
  historySyncGeneration: number;
  agentHistorySyncGeneration: Map<string, number>;
  initializingAgents: Map<string, boolean>;
  agents: Map<string, Agent>;
  pendingPermissions: Map<string, PendingPermission>;
  fileExplorer: Map<string, AgentFileExplorerState>;
  queuedMessages: Map<string, QueuedMessage[]>;
}

interface SessionStoreState {
  sessions: Record<string, SessionState>;
  agentLastActivity: Map<string, Date>;
}

type SetterOrValue<T> = T | ((prev: T) => T);

interface SessionStoreActions {
  initializeSession: (serverId: string, client: unknown) => void;
  clearSession: (serverId: string) => void;
  getSession: (serverId: string) => SessionState | undefined;
  updateSessionClient: (serverId: string, client: unknown) => void;
  updateSessionServerInfo: (serverId: string, info: DaemonServerInfo) => void;
  setIsPlayingAudio: (serverId: string, playing: boolean) => void;
  setFocusedAgentId: (serverId: string, agentId: string | null) => void;
  setMessages: (
    serverId: string,
    messages: SetterOrValue<MessageEntry[]>
  ) => void;
  setCurrentAssistantMessage: (
    serverId: string,
    message: SetterOrValue<string>
  ) => void;
  setAgentStreamTail: (
    serverId: string,
    state: SetterOrValue<Map<string, StreamItem[]>>
  ) => void;
  setAgentStreamHead: (
    serverId: string,
    state: SetterOrValue<Map<string, StreamItem[]>>
  ) => void;
  clearAgentStreamHead: (serverId: string, agentId: string) => void;
  setAgentTimelineCursor: (
    serverId: string,
    state: SetterOrValue<Map<string, AgentTimelineCursorState>>
  ) => void;
  bumpHistorySyncGeneration: (serverId: string) => void;
  markAgentHistorySynchronized: (serverId: string, agentId: string) => void;
  setInitializingAgents: (
    serverId: string,
    state: SetterOrValue<Map<string, boolean>>
  ) => void;
  setAgents: (
    serverId: string,
    agents: SetterOrValue<Map<string, Agent>>
  ) => void;
  setAgentLastActivity: (agentId: string, timestamp: Date) => void;
  setPendingPermissions: (
    serverId: string,
    perms: SetterOrValue<Map<string, PendingPermission>>
  ) => void;
  setFileExplorer: (
    serverId: string,
    state: SetterOrValue<Map<string, AgentFileExplorerState>>
  ) => void;
  setQueuedMessages: (
    serverId: string,
    value: SetterOrValue<Map<string, QueuedMessage[]>>
  ) => void;
  setHasHydratedAgents: (serverId: string, hydrated: boolean) => void;
  getAgentDirectory: (serverId: string) => AgentDirectoryEntry[] | undefined;
}

type SessionStore = SessionStoreState & SessionStoreActions;

function createInitialSessionState(
  serverId: string,
  client: unknown
): SessionState {
  return {
    serverId,
    client,
    serverInfo: null,
    hasHydratedAgents: false,
    isPlayingAudio: false,
    focusedAgentId: null,
    messages: [],
    currentAssistantMessage: "",
    agentStreamTail: new Map(),
    agentStreamHead: new Map(),
    agentTimelineCursor: new Map(),
    historySyncGeneration: 0,
    agentHistorySyncGeneration: new Map(),
    initializingAgents: new Map(),
    agents: new Map(),
    pendingPermissions: new Map(),
    fileExplorer: new Map(),
    queuedMessages: new Map(),
  };
}

function areServerCapabilitiesEqual(
  current: ServerCapabilities | undefined,
  next: ServerCapabilities | undefined
): boolean {
  return JSON.stringify(current ?? null) === JSON.stringify(next ?? null);
}

function resolve<T>(value: SetterOrValue<T>, prev: T): T {
  return typeof value === "function"
    ? (value as (current: T) => T)(prev)
    : value;
}

function updateSession(
  prev: SessionStoreState,
  serverId: string,
  patch: Partial<SessionState>
): SessionStoreState {
  const session = prev.sessions[serverId];
  if (!session) {
    return prev;
  }
  return {
    ...prev,
    sessions: {
      ...prev.sessions,
      [serverId]: { ...session, ...patch },
    },
  };
}

export const useSessionStore = create<SessionStore>()(
  subscribeWithSelector((set, get) => ({
    sessions: {},
    agentLastActivity: new Map(),

    initializeSession: (serverId, client) => {
      set((prev) => {
        if (prev.sessions[serverId]) {
          return prev;
        }
        return {
          ...prev,
          sessions: {
            ...prev.sessions,
            [serverId]: createInitialSessionState(serverId, client),
          },
        };
      });
    },

    clearSession: (serverId) => {
      set((prev) => {
        if (!(serverId in prev.sessions)) {
          return prev;
        }
        const nextSessions = { ...prev.sessions };
        delete nextSessions[serverId];
        return { ...prev, sessions: nextSessions };
      });
    },

    updateSessionClient: (serverId, client) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session || session.client === client) {
          return prev;
        }
        return updateSession(prev, serverId, { client });
      });
    },

    updateSessionServerInfo: (serverId, info) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }

        const nextHostname = info.hostname?.trim() || null;
        const prevHostname = session.serverInfo?.hostname?.trim() || null;
        const nextVersion = info.version?.trim() || null;
        const prevVersion = session.serverInfo?.version?.trim() || null;

        if (
          session.serverInfo?.serverId === info.serverId &&
          prevHostname === nextHostname &&
          prevVersion === nextVersion &&
          areServerCapabilitiesEqual(
            session.serverInfo?.capabilities,
            info.capabilities
          )
        ) {
          return prev;
        }

        return updateSession(prev, serverId, {
          serverInfo: {
            serverId: info.serverId,
            hostname: nextHostname,
            version: nextVersion,
            ...(info.capabilities ? { capabilities: info.capabilities } : {}),
          },
        });
      });
    },

    getSession: (serverId) => get().sessions[serverId],

    setIsPlayingAudio: (serverId, playing) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session || session.isPlayingAudio === playing) {
          return prev;
        }
        return updateSession(prev, serverId, { isPlayingAudio: playing });
      });
    },

    setFocusedAgentId: (serverId, agentId) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session || session.focusedAgentId === agentId) {
          return prev;
        }
        return updateSession(prev, serverId, { focusedAgentId: agentId });
      });
    },

    setMessages: (serverId, messages) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(messages, session.messages);
        if (session.messages === next) {
          return prev;
        }
        return updateSession(prev, serverId, { messages: next });
      });
    },

    setCurrentAssistantMessage: (serverId, message) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(message, session.currentAssistantMessage);
        if (session.currentAssistantMessage === next) {
          return prev;
        }
        return updateSession(prev, serverId, {
          currentAssistantMessage: next,
        });
      });
    },

    setAgentStreamTail: (serverId, state) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(state, session.agentStreamTail);
        if (session.agentStreamTail === next) {
          return prev;
        }
        return updateSession(prev, serverId, { agentStreamTail: next });
      });
    },

    setAgentStreamHead: (serverId, state) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(state, session.agentStreamHead);
        if (session.agentStreamHead === next) {
          return prev;
        }
        return updateSession(prev, serverId, { agentStreamHead: next });
      });
    },

    clearAgentStreamHead: (serverId, agentId) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session?.agentStreamHead.has(agentId)) {
          return prev;
        }
        const nextHead = new Map(session.agentStreamHead);
        nextHead.delete(agentId);
        return updateSession(prev, serverId, {
          agentStreamHead: nextHead,
        });
      });
    },

    setAgentTimelineCursor: (serverId, state) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(state, session.agentTimelineCursor);
        if (session.agentTimelineCursor === next) {
          return prev;
        }
        return updateSession(prev, serverId, {
          agentTimelineCursor: next,
        });
      });
    },

    bumpHistorySyncGeneration: (serverId) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        return updateSession(prev, serverId, {
          historySyncGeneration: session.historySyncGeneration + 1,
        });
      });
    },

    markAgentHistorySynchronized: (serverId, agentId) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const currentGeneration = session.historySyncGeneration;
        if (
          session.agentHistorySyncGeneration.get(agentId) === currentGeneration
        ) {
          return prev;
        }
        const nextMap = new Map(session.agentHistorySyncGeneration);
        nextMap.set(agentId, currentGeneration);
        return updateSession(prev, serverId, {
          agentHistorySyncGeneration: nextMap,
        });
      });
    },

    setInitializingAgents: (serverId, state) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(state, session.initializingAgents);
        if (session.initializingAgents === next) {
          return prev;
        }
        return updateSession(prev, serverId, {
          initializingAgents: next,
        });
      });
    },

    setAgents: (serverId, agents) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(agents, session.agents);
        if (session.agents === next) {
          return prev;
        }
        return updateSession(prev, serverId, { agents: next });
      });
    },

    setAgentLastActivity: (agentId, timestamp) => {
      set((prev) => {
        const current = prev.agentLastActivity.get(agentId);
        if (current && current.getTime() === timestamp.getTime()) {
          return prev;
        }
        const nextActivity = new Map(prev.agentLastActivity);
        nextActivity.set(agentId, timestamp);
        return { ...prev, agentLastActivity: nextActivity };
      });
    },

    setPendingPermissions: (serverId, perms) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(perms, session.pendingPermissions);
        if (session.pendingPermissions === next) {
          return prev;
        }
        return updateSession(prev, serverId, {
          pendingPermissions: next,
        });
      });
    },

    setFileExplorer: (serverId, state) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(state, session.fileExplorer);
        if (session.fileExplorer === next) {
          return prev;
        }
        return updateSession(prev, serverId, { fileExplorer: next });
      });
    },

    setQueuedMessages: (serverId, value) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session) {
          return prev;
        }
        const next = resolve(value, session.queuedMessages);
        if (session.queuedMessages === next) {
          return prev;
        }
        return updateSession(prev, serverId, { queuedMessages: next });
      });
    },

    setHasHydratedAgents: (serverId, hydrated) => {
      set((prev) => {
        const session = prev.sessions[serverId];
        if (!session || session.hasHydratedAgents === hydrated) {
          return prev;
        }
        return updateSession(prev, serverId, {
          hasHydratedAgents: hydrated,
        });
      });
    },

    getAgentDirectory: (serverId) => {
      const state = get();
      const session = state.sessions[serverId];
      if (!session) {
        return;
      }

      const entries: AgentDirectoryEntry[] = [];
      for (const agent of session.agents.values()) {
        const lastActivityAt =
          state.agentLastActivity.get(agent.id) ?? agent.lastActivityAt;
        entries.push({
          id: agent.id,
          serverId,
          title: agent.title ?? null,
          status: agent.status,
          lastActivityAt,
          cwd: agent.cwd,
          provider: agent.provider,
          requiresAttention: agent.requiresAttention ?? false,
          attentionReason: agent.attentionReason ?? null,
          attentionTimestamp: agent.attentionTimestamp ?? null,
          archivedAt: agent.archivedAt ?? null,
          labels: Object.keys(agent.labels),
        });
      }
      return entries;
    },
  }))
);
