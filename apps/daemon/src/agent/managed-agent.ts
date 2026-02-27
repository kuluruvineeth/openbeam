import type {
  AgentCapabilityFlags,
  AgentMode,
  AgentPermissionRequest,
  AgentPersistenceHandle,
  AgentProvider,
  AgentRuntimeInfo,
  AgentSession,
  AgentSessionConfig,
  AgentStreamEvent,
  AgentTimelineItem,
  AgentUsage,
} from "@openplane/types/services/daemon";

export type AgentTimelineRow = {
  seq: number;
  timestamp: string;
  item: AgentTimelineItem;
};

export type AgentTimelineCursor = {
  epoch: string;
  seq: number;
};

export type AgentTimelineFetchDirection = "tail" | "before" | "after";

export type AgentTimelineFetchOptions = {
  direction?: AgentTimelineFetchDirection;
  cursor?: AgentTimelineCursor;
  limit?: number;
};

export type AgentTimelineWindow = {
  minSeq: number;
  maxSeq: number;
  nextSeq: number;
};

export type AgentTimelineFetchResult = {
  epoch: string;
  direction: AgentTimelineFetchDirection;
  reset: boolean;
  staleCursor: boolean;
  gap: boolean;
  window: AgentTimelineWindow;
  hasOlder: boolean;
  hasNewer: boolean;
  rows: AgentTimelineRow[];
};

export type AttentionState =
  | { requiresAttention: false }
  | {
      requiresAttention: true;
      attentionReason: "finished" | "error" | "permission";
      attentionTimestamp: Date;
    };

type ManagedAgentBase = {
  id: string;
  provider: AgentProvider;
  cwd: string;
  capabilities: AgentCapabilityFlags;
  config: AgentSessionConfig;
  runtimeInfo?: AgentRuntimeInfo;
  createdAt: Date;
  updatedAt: Date;
  availableModes: AgentMode[];
  currentModeId: string | null;
  pendingPermissions: Map<string, AgentPermissionRequest>;
  timeline: AgentTimelineItem[];
  timelineRows: AgentTimelineRow[];
  timelineEpoch: string;
  timelineNextSeq: number;
  persistence: AgentPersistenceHandle | null;
  historyPrimed: boolean;
  lastUserMessageAt: Date | null;
  lastUsage?: AgentUsage;
  lastError?: string;
  attention: AttentionState;
  internal?: boolean;
  labels: Record<string, string>;
};

type ManagedAgentWithSession = ManagedAgentBase & {
  session: AgentSession;
};

type ManagedAgentInitializing = ManagedAgentWithSession & {
  lifecycle: "initializing";
  pendingRun: null;
};

type ManagedAgentIdle = ManagedAgentWithSession & {
  lifecycle: "idle";
  pendingRun: null;
};

type ManagedAgentRunning = ManagedAgentWithSession & {
  lifecycle: "running";
  pendingRun: AsyncGenerator<AgentStreamEvent>;
};

type ManagedAgentError = ManagedAgentWithSession & {
  lifecycle: "error";
  pendingRun: null;
  lastError: string;
};

type ManagedAgentClosed = ManagedAgentBase & {
  lifecycle: "closed";
  session: null;
  pendingRun: null;
};

export type ManagedAgent =
  | ManagedAgentInitializing
  | ManagedAgentIdle
  | ManagedAgentRunning
  | ManagedAgentError
  | ManagedAgentClosed;

export type ActiveManagedAgent =
  | ManagedAgentInitializing
  | ManagedAgentIdle
  | ManagedAgentRunning
  | ManagedAgentError;
