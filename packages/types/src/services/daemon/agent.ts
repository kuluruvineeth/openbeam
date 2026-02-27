export type AgentProvider = string;

export type AgentMetadata = Record<string, unknown>;

export interface McpStdioServerConfig {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpHttpServerConfig {
  type: "http";
  url: string;
  headers?: Record<string, string>;
}

export interface McpSseServerConfig {
  type: "sse";
  url: string;
  headers?: Record<string, string>;
}

export type McpServerConfig =
  | McpStdioServerConfig
  | McpHttpServerConfig
  | McpSseServerConfig;

export type AgentMode = {
  id: string;
  label: string;
  description?: string;
};

export type AgentModelDefinition = {
  provider: AgentProvider;
  id: string;
  label: string;
  description?: string;
  isDefault?: boolean;
  metadata?: AgentMetadata;
  thinkingOptions?: AgentSelectOption[];
  defaultThinkingOptionId?: string;
};

export type AgentSelectOption = {
  id: string;
  label: string;
  description?: string;
  isDefault?: boolean;
  metadata?: AgentMetadata;
};

export type AgentCapabilityFlags = {
  supportsStreaming: boolean;
  supportsSessionPersistence: boolean;
  supportsDynamicModes: boolean;
  supportsMcpServers: boolean;
  supportsReasoningStream: boolean;
  supportsToolInvocations: boolean;
};

export type AgentPersistenceHandle = {
  provider: AgentProvider;
  sessionId: string;
  nativeHandle?: string;
  metadata?: AgentMetadata;
};

export type AgentPromptContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export type AgentPromptInput = string | AgentPromptContentBlock[];

export type AgentRunOptions = {
  outputSchema?: unknown;
  resumeFrom?: AgentPersistenceHandle;
  maxThinkingTokens?: number;
};

export type AgentUsage = {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalCostUsd?: number;
};

export type ToolCallDetail =
  | {
      type: "shell";
      command: string;
      cwd?: string;
      output?: string;
      exitCode?: number | null;
    }
  | {
      type: "read";
      filePath: string;
      content?: string;
      offset?: number;
      limit?: number;
    }
  | {
      type: "edit";
      filePath: string;
      oldString?: string;
      newString?: string;
      unifiedDiff?: string;
    }
  | {
      type: "write";
      filePath: string;
      content?: string;
    }
  | {
      type: "search";
      query: string;
    }
  | {
      type: "worktree_setup";
      worktreePath: string;
      branchName: string;
      log: string;
      commands: Array<{
        index: number;
        command: string;
        cwd: string;
        status: "running" | "completed" | "failed";
        exitCode: number | null;
        durationMs?: number;
      }>;
      truncated?: boolean;
    }
  | {
      type: "unknown";
      input: unknown | null;
      output: unknown | null;
    };

type ToolCallBase = {
  type: "tool_call";
  callId: string;
  name: string;
  detail: ToolCallDetail;
  metadata?: Record<string, unknown>;
};

type ToolCallRunningTimelineItem = ToolCallBase & {
  status: "running";
  error: null;
};

type ToolCallCompletedTimelineItem = ToolCallBase & {
  status: "completed";
  error: null;
};

type ToolCallFailedTimelineItem = ToolCallBase & {
  status: "failed";
  error: unknown;
};

type ToolCallCanceledTimelineItem = ToolCallBase & {
  status: "canceled";
  error: null;
};

export type ToolCallTimelineItem =
  | ToolCallRunningTimelineItem
  | ToolCallCompletedTimelineItem
  | ToolCallFailedTimelineItem
  | ToolCallCanceledTimelineItem;

export type CompactionTimelineItem = {
  type: "compaction";
  status: "loading" | "completed";
  trigger?: "auto" | "manual";
  preTokens?: number;
};

export type AgentTimelineItem =
  | { type: "user_message"; text: string; messageId?: string }
  | { type: "assistant_message"; text: string }
  | { type: "reasoning"; text: string }
  | ToolCallTimelineItem
  | { type: "todo"; items: { text: string; completed: boolean }[] }
  | { type: "error"; message: string }
  | CompactionTimelineItem;

export type AgentStreamEvent =
  | { type: "thread_started"; sessionId: string; provider: AgentProvider }
  | { type: "turn_started"; provider: AgentProvider }
  | { type: "turn_completed"; provider: AgentProvider; usage?: AgentUsage }
  | { type: "turn_failed"; provider: AgentProvider; error: string }
  | { type: "turn_canceled"; provider: AgentProvider; reason: string }
  | {
      type: "timeline";
      item: AgentTimelineItem;
      provider: AgentProvider;
    }
  | {
      type: "permission_requested";
      provider: AgentProvider;
      request: AgentPermissionRequest;
    }
  | {
      type: "permission_resolved";
      provider: AgentProvider;
      requestId: string;
      resolution: AgentPermissionResponse;
    }
  | {
      type: "attention_required";
      provider: AgentProvider;
      reason: "finished" | "error" | "permission";
      timestamp: string;
    };

export type AgentPermissionRequestKind =
  | "tool"
  | "plan"
  | "question"
  | "mode"
  | "other";

export type AgentPermissionUpdate = AgentMetadata;

export type AgentPermissionRequest = {
  id: string;
  provider: AgentProvider;
  name: string;
  kind: AgentPermissionRequestKind;
  title?: string;
  description?: string;
  input?: AgentMetadata;
  detail?: ToolCallDetail;
  suggestions?: AgentPermissionUpdate[];
  metadata?: AgentMetadata;
};

export type AgentPermissionResponse =
  | {
      behavior: "allow";
      updatedInput?: AgentMetadata;
      updatedPermissions?: AgentPermissionUpdate[];
    }
  | {
      behavior: "deny";
      message?: string;
      interrupt?: boolean;
    };

export type AgentRunResult = {
  sessionId: string;
  finalText: string;
  usage?: AgentUsage;
  timeline: AgentTimelineItem[];
  canceled?: boolean;
};

export type AgentRuntimeInfo = {
  provider: AgentProvider;
  sessionId: string | null;
  model?: string | null;
  modeId?: string | null;
  extra?: AgentMetadata;
};

export type AgentSlashCommand = {
  name: string;
  description: string;
  argumentHint: string;
};

export type ListPersistedAgentsOptions = {
  limit?: number;
};

export type PersistedAgentDescriptor = {
  provider: AgentProvider;
  sessionId: string;
  cwd: string;
  title: string | null;
  lastActivityAt: Date;
  persistence: AgentPersistenceHandle;
  timeline: AgentTimelineItem[];
};

export type AgentSessionConfig = {
  provider: AgentProvider;
  cwd: string;
  systemPrompt?: string;
  modeId?: string;
  model?: string;
  thinkingOptionId?: string;
  title?: string | null;
  approvalPolicy?: string;
  sandboxMode?: string;
  networkAccess?: boolean;
  webSearch?: boolean;
  extra?: {
    codex?: AgentMetadata;
    claude?: Record<string, unknown>;
  };
  mcpServers?: Record<string, McpServerConfig>;
  internal?: boolean;
};

export interface AgentSession {
  readonly provider: AgentProvider;
  readonly id: string | null;
  readonly capabilities: AgentCapabilityFlags;
  run(
    prompt: AgentPromptInput,
    options?: AgentRunOptions
  ): Promise<AgentRunResult>;
  stream(
    prompt: AgentPromptInput,
    options?: AgentRunOptions
  ): AsyncGenerator<AgentStreamEvent>;
  streamHistory(): AsyncGenerator<AgentStreamEvent>;
  getRuntimeInfo(): Promise<AgentRuntimeInfo>;
  getAvailableModes(): Promise<AgentMode[]>;
  getCurrentMode(): Promise<string | null>;
  setMode(modeId: string): Promise<void>;
  getPendingPermissions(): AgentPermissionRequest[];
  respondToPermission(
    requestId: string,
    response: AgentPermissionResponse
  ): Promise<void>;
  describePersistence(): AgentPersistenceHandle | null;
  interrupt(): Promise<void>;
  close(): Promise<void>;
  listCommands?(): Promise<AgentSlashCommand[]>;
  setModel?(modelId: string | null): Promise<void>;
  setThinkingOption?(thinkingOptionId: string | null): Promise<void>;
}

export interface ListModelsOptions {
  cwd?: string;
}

export interface AgentClient {
  readonly provider: AgentProvider;
  readonly capabilities: AgentCapabilityFlags;
  createSession(config: AgentSessionConfig): Promise<AgentSession>;
  resumeSession(
    handle: AgentPersistenceHandle,
    overrides?: Partial<AgentSessionConfig>
  ): Promise<AgentSession>;
  listModels(options?: ListModelsOptions): Promise<AgentModelDefinition[]>;
  listPersistedAgents?(
    options?: ListPersistedAgentsOptions
  ): Promise<PersistedAgentDescriptor[]>;
  isAvailable(): Promise<boolean>;
}
