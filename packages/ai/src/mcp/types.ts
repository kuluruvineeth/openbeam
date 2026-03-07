import type {
  MCPPromptResult,
  MCPRequestMethod,
  MCPResourceReadResult,
  MCPServerContext,
  MCPToolResult,
} from "@openbeam/types/ai";
import type { z } from "zod";

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  category?: string;
  allowedCallers?: string[];
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
