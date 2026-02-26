declare module "onnxruntime-node" {
  export interface InferenceSession {
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
    inputNames: string[];
    outputNames: string[];
    inputMetadata?: unknown;
  }

  // biome-ignore lint/style/noNamespace: necessary for this context
  export namespace InferenceSession {
    function create(
      path: string,
      options?: { executionProviders?: string[] }
    ): Promise<InferenceSession>;
  }

  export class Tensor {
    constructor(
      type: string,
      data: Float32Array | Int32Array | BigInt64Array | Uint8Array,
      dims?: number[]
    );
    data: Float32Array | Int32Array | BigInt64Array | Uint8Array;
    dims: number[];
    type: string;
  }
}

declare module "@sctg/sentencepiece-js" {
  export class SentencePieceProcessor {
    encodeIds(text: string): number[];
    load?(modelPath: string): unknown;
    Load?(modelPath: string): unknown;
  }
}

declare module "@anthropic-ai/claude-agent-sdk" {
  import type { ChildProcess } from "node:child_process";

  export interface SpawnOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
    args: string[];
    command: string;
  }

  export interface McpServerConfig {
    name?: string;
    type?: string;
    url?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    headers?: Record<string, string>;
    [key: string]: unknown;
  }

  export interface ModelInfo {
    value?: string;
    label?: string;
    displayName?: string;
    description?: string;
    [key: string]: unknown;
  }

  export type PermissionMode =
    | "default"
    | "acceptEdits"
    | "bypassPermissions"
    | "plan";

  export type PermissionResult =
    | {
        behavior: "allow";
        updatedInput?: unknown;
        updatedPermissions?: PermissionUpdate[];
      }
    | { behavior: "deny"; message?: string; interrupt?: boolean }
    | { behavior: "abort" };

  export interface PermissionUpdate {
    mode?: PermissionMode;
    type?: string;
    rules?: unknown[];
    behavior?: string;
    destination?: string;
    [key: string]: unknown;
  }

  export interface SDKMessage {
    type: string;
    subtype?: string;
    message?: { role?: string; content?: unknown; [key: string]: unknown };
    event?: SDKStreamEvent;
    tool_name?: string;
    uuid?: string;
    parent_tool_use_id?: string | null;
    session_id?: string;
    sessionId?: string;
    session?: { id?: string } | null;
    permissionMode?: PermissionMode;
    model?: string;
    errors?: string[];
    isSidechain?: boolean;
    isCompactSummary?: boolean;
    status?: string;
    compact_metadata?: { trigger?: string; pre_tokens?: number };
    [key: string]: unknown;
  }

  export interface SDKStreamEvent {
    type: string;
    content_block?: unknown;
    delta?: unknown;
    index?: number;
    [key: string]: unknown;
  }

  export interface SDKPartialAssistantMessage extends SDKMessage {
    type: "assistant";
    event: SDKStreamEvent;
  }

  export interface SDKResultMessage extends SDKMessage {
    type: "result";
    subtype?: string;
    usage: {
      input_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      output_tokens: number;
    };
    total_cost_usd: number;
  }

  export interface SDKSystemMessage extends SDKMessage {
    type: "system";
    subtype?: string;
    permissionMode?: PermissionMode;
    model?: string;
    session_id?: string;
    sessionId?: string;
    session?: { id?: string } | null;
  }

  export interface SDKUserMessage extends SDKMessage {
    type: "user";
    uuid?: string;
    session_id?: string;
  }

  export interface Options {
    cwd?: string;
    model?: string;
    permissionMode?: PermissionMode;
    systemPrompt?: string | { type: string; preset: string; append: string };
    appendSystemPrompt?: string;
    maxTurns?: number;
    maxThinkingTokens?: number;
    mcpServers?: Record<string, McpServerConfig> | McpServerConfig[];
    canUseTool?: CanUseTool;
    spawnClaudeCodeProcess?: (options: SpawnOptions) => ChildProcess;
    abortController?: AbortController;
    includePartialMessages?: boolean;
    agents?: unknown;
    pathToClaudeCodeExecutable?: string;
    settingSources?: string[];
    stderr?: (data: string) => void;
    env?: Record<string, string | undefined>;
    enableFileCheckpointing?: boolean;
    resume?: string;
    prompt?: unknown;
    [key: string]: unknown;
  }

  export type CanUseTool = (
    toolName: string,
    input: Record<string, unknown>,
    options: {
      toolUseID?: string;
      suggestions?: Array<{ [key: string]: unknown }>;
      signal?: AbortSignal;
      [key: string]: unknown;
    }
  ) => Promise<PermissionResult>;

  export interface AgentDefinition {
    id: string;
    name: string;
    [key: string]: unknown;
  }

  export interface SlashCommandInfo {
    name: string;
    description: string;
    argumentHint?: string;
    [key: string]: unknown;
  }

  export interface RewindResult {
    canRewind: boolean;
    error?: string;
    filesChanged?: string[];
    insertions?: number;
    deletions?: number;
  }

  export interface Query {
    messages: AsyncIterable<SDKMessage>;
    abort(): void;
    supportedModels(): Promise<ModelInfo[]>;
    setPermissionMode(mode: PermissionMode): Promise<void>;
    setModel(model?: string): Promise<void>;
    next(): Promise<IteratorResult<SDKMessage, void>>;
    interrupt(): Promise<void>;
    return(): Promise<void>;
    supportedCommands(): Promise<SlashCommandInfo[]>;
    rewindFiles(
      messageId: string,
      options: { dryRun: boolean }
    ): Promise<RewindResult>;
    [key: string]: unknown;
  }

  export function query(options: { prompt: unknown; options: Options }): Query;
}

declare module "@opencode-ai/sdk/v2/client" {
  interface OpencodeApiResponse<T = unknown> {
    data?: T;
    error?: unknown;
  }

  interface OpencodeMessageEntry {
    info: { role: string; [key: string]: unknown };
    parts: Record<string, unknown>[];
    [key: string]: unknown;
  }

  interface OpencodeSessionClient {
    create(
      opts: Record<string, unknown>
    ): Promise<OpencodeApiResponse<{ id: string; [key: string]: unknown }>>;
    promptAsync(opts: Record<string, unknown>): Promise<OpencodeApiResponse>;
    abort(opts: Record<string, unknown>): Promise<void>;
    messages(
      opts: Record<string, unknown>
    ): Promise<OpencodeApiResponse<OpencodeMessageEntry[]>>;
    [key: string]: unknown;
  }

  interface OpencodeProviderListResult {
    connected: string[];
    all: Array<{
      id: string;
      models: Record<string, unknown>;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }

  interface OpencodeProviderClient {
    list(
      opts: Record<string, unknown>
    ): Promise<OpencodeApiResponse<OpencodeProviderListResult>>;
    [key: string]: unknown;
  }

  interface OpencodeEventClient {
    subscribe(
      opts: Record<string, unknown>
    ): Promise<{ stream: AsyncIterable<unknown>; [key: string]: unknown }>;
    [key: string]: unknown;
  }

  interface OpencodePermissionClient {
    reply(opts: Record<string, unknown>): Promise<void>;
    [key: string]: unknown;
  }

  interface OpencodeMcpClient {
    add(opts: Record<string, unknown>): Promise<{ error?: unknown }>;
    connect(opts: Record<string, unknown>): Promise<{ error?: unknown }>;
    [key: string]: unknown;
  }

  export interface OpencodeClient {
    session: OpencodeSessionClient;
    provider: OpencodeProviderClient;
    event: OpencodeEventClient;
    permission: OpencodePermissionClient;
    mcp: OpencodeMcpClient;
    get(
      path: string,
      params?: Record<string, unknown>
    ): Promise<{ data: unknown }>;
    post(path: string, body?: unknown): Promise<{ data: unknown }>;
    put(path: string, body?: unknown): Promise<{ data: unknown }>;
    delete(
      path: string,
      params?: Record<string, unknown>
    ): Promise<{ data: unknown }>;
    request(method: string, params?: unknown): Promise<unknown>;
    subscribe(
      path: string,
      callback: (data: unknown) => void
    ): { unsubscribe(): void };
    [key: string]: unknown;
  }

  export function createOpencodeClient(options: {
    url?: string;
    baseURL?: string;
    baseUrl?: string;
    directory?: string;
    [key: string]: unknown;
  }): OpencodeClient;
}
