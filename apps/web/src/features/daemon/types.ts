import type {
  AgentLifecycleStatus,
  AgentPermissionRequest,
  AgentProvider,
  ToolCallDetail,
} from "@openplane/types/services/daemon";
import type { AgentStreamEventPayload } from "@openplane/types/services/daemon/messages";

export type StreamItem =
  | UserMessageItem
  | AssistantMessageItem
  | ThoughtItem
  | ToolCallItem
  | TodoListItem
  | ActivityLogItem
  | CompactionItem;

export interface UserMessageImageAttachment {
  uri: string;
  mimeType: string;
}

export interface UserMessageItem {
  kind: "user_message";
  id: string;
  text: string;
  timestamp: Date;
  images?: UserMessageImageAttachment[];
}

export interface AssistantMessageItem {
  kind: "assistant_message";
  id: string;
  text: string;
  timestamp: Date;
}

export type ThoughtStatus = "loading" | "ready";

export interface ThoughtItem {
  kind: "thought";
  id: string;
  text: string;
  timestamp: Date;
  status: ThoughtStatus;
}

export type OrchestratorToolCallStatus = "executing" | "completed" | "failed";
export type AgentToolCallStatus =
  | "running"
  | "completed"
  | "failed"
  | "canceled";

interface OrchestratorToolCallData {
  toolCallId: string;
  toolName: string;
  arguments: unknown;
  result?: unknown;
  error?: unknown;
  status: OrchestratorToolCallStatus;
}

export interface AgentToolCallData {
  provider: AgentProvider;
  callId: string;
  name: string;
  status: AgentToolCallStatus;
  error: unknown | null;
  detail: ToolCallDetail;
  metadata?: Record<string, unknown>;
}

export type ToolCallPayload =
  | { source: "agent"; data: AgentToolCallData }
  | { source: "orchestrator"; data: OrchestratorToolCallData };

export interface ToolCallItem {
  kind: "tool_call";
  id: string;
  timestamp: Date;
  payload: ToolCallPayload;
}

export type AgentToolCallItem = ToolCallItem & {
  payload: { source: "agent"; data: AgentToolCallData };
};

export function isAgentToolCallItem(
  item: StreamItem
): item is AgentToolCallItem {
  return item.kind === "tool_call" && item.payload.source === "agent";
}

type ActivityLogType = "system" | "info" | "success" | "error";

export interface ActivityLogItem {
  kind: "activity_log";
  id: string;
  timestamp: Date;
  activityType: ActivityLogType;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface CompactionItem {
  kind: "compaction";
  id: string;
  timestamp: Date;
  status: "loading" | "completed";
  trigger?: "auto" | "manual";
  preTokens?: number;
}

export type TodoEntry = { text: string; completed: boolean };

export interface TodoListItem {
  kind: "todo_list";
  id: string;
  timestamp: Date;
  provider: AgentProvider;
  items: TodoEntry[];
}

export interface ApplyStreamEventResult {
  tail: StreamItem[];
  head: StreamItem[];
  changedTail: boolean;
  changedHead: boolean;
}

export interface AgentDirectoryEntry {
  id: string;
  serverId: string;
  title: string | null;
  status: AgentLifecycleStatus;
  lastActivityAt: Date | null;
  cwd: string;
  provider: AgentProvider;
  requiresAttention: boolean;
  attentionReason: string | null;
  attentionTimestamp: Date | null;
  archivedAt: Date | null;
  labels: string[];
}

export interface PendingPermission {
  key: string;
  agentId: string;
  request: AgentPermissionRequest;
}

export type DiffSegment = {
  text: string;
  changed: boolean;
};

export type DiffLine = {
  type: "add" | "remove" | "context" | "header";
  content: string;
  segments?: DiffSegment[];
};

export type TaskStatus = "pending" | "in_progress" | "completed";

export type TaskEntry = {
  text: string;
  status: TaskStatus;
  completed: boolean;
};

export type { AgentStreamEventPayload };
