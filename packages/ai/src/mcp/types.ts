import type { z } from "zod";

export type MCPTransport = "stdio" | "sse" | "websocket";

export interface MCPServerConfig {
  name: string;
  version: string;
  transport: MCPTransport;
  capabilities: MCPCapabilities;
}

export interface MCPCapabilities {
  tools: boolean;
  resources: boolean;
  prompts: boolean;
  logging?: boolean;
  sampling?: boolean;
}

export interface MCPClientInfo {
  name: string;
  version: string;
  protocolVersion?: string;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  category?: string;
  allowedCallers?: string[];
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: MCPContent[];
  isError?: boolean;
}

export type MCPContentType = "text" | "image" | "resource";

export interface MCPTextContent {
  type: "text";
  text: string;
}

export interface MCPImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

export interface MCPResourceContent {
  type: "resource";
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;

export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceReadResult {
  contents: MCPResourceContent[];
}

export interface MCPPromptDefinition {
  name: string;
  description: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptMessage {
  role: "user" | "assistant";
  content: MCPContent;
}

export interface MCPPromptResult {
  description?: string;
  messages: MCPPromptMessage[];
}

export type MCPRequestMethod =
  | "initialize"
  | "initialized"
  | "ping"
  | "tools/list"
  | "tools/call"
  | "resources/list"
  | "resources/templates/list"
  | "resources/read"
  | "resources/subscribe"
  | "resources/unsubscribe"
  | "prompts/list"
  | "prompts/get"
  | "logging/setLevel"
  | "sampling/createMessage";

export interface MCPRequest<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  method: MCPRequestMethod;
  params?: T;
}

export interface MCPResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  result?: T;
  error?: MCPError;
}

export interface MCPNotification<T = unknown> {
  jsonrpc: "2.0";
  method: string;
  params?: T;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32_700,
  INVALID_REQUEST: -32_600,
  METHOD_NOT_FOUND: -32_601,
  INVALID_PARAMS: -32_602,
  INTERNAL_ERROR: -32_603,
  RESOURCE_NOT_FOUND: -32_002,
  TOOL_NOT_FOUND: -32_003,
  PROMPT_NOT_FOUND: -32_004,
  UNAUTHORIZED: -32_005,
  RATE_LIMITED: -32_006,
} as const;

export type MCPErrorCode =
  (typeof MCP_ERROR_CODES)[keyof typeof MCP_ERROR_CODES];

export interface InitializeParams {
  protocolVersion: string;
  capabilities: Partial<MCPCapabilities>;
  clientInfo: MCPClientInfo;
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface ToolsListResult {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}

export interface ToolsCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ResourcesListResult {
  resources: MCPResource[];
  nextCursor?: string;
}

export interface ResourcesReadParams {
  uri: string;
}

export interface PromptsListResult {
  prompts: MCPPromptDefinition[];
}

export interface PromptsGetParams {
  name: string;
  arguments?: Record<string, string>;
}

export interface MCPServerContext {
  teamId: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPServerOptions {
  name: string;
  version: string;
  capabilities?: Partial<MCPCapabilities>;
}

export interface MCPMessageHandler {
  handleRequest<T, R>(
    method: MCPRequestMethod,
    params: T,
    context: MCPServerContext
  ): Promise<R>;
  handleNotification<T>(
    method: string,
    params: T,
    context: MCPServerContext
  ): Promise<void>;
}

export type MCPToolExecutor = (
  name: string,
  args: Record<string, unknown>,
  context: MCPServerContext
) => Promise<MCPToolResult>;

export type MCPResourceReader = (
  uri: string,
  context: MCPServerContext
) => Promise<MCPResourceReadResult>;

export type MCPPromptGetter = (
  name: string,
  args: Record<string, string>,
  context: MCPServerContext
) => Promise<MCPPromptResult>;
