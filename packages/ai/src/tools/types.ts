/**
 * Tool System Types
 *
 * Type definitions for the AI tool registry and execution.
 */

import type { z } from "zod";

/**
 * Tool parameter schema (using Zod for runtime validation)
 */
export type ToolParameterSchema = z.ZodType;

/**
 * Tool definition
 */
export interface ToolDefinition<
  TParams extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> {
  /** Unique tool identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Parameter schema for validation */
  parameters: ToolParameterSchema;

  /** Tool category for organization */
  category?: ToolCategory;

  /** Whether this tool requires confirmation before execution */
  requiresConfirmation?: boolean;

  /** Whether this tool can be run in parallel with others */
  parallelizable?: boolean;

  /** Execute the tool */
  execute: (params: TParams, context: ToolContext) => Promise<TResult>;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tool categories
 */
export type ToolCategory =
  | "search"
  | "data"
  | "action"
  | "communication"
  | "utility"
  | "mcp"
  | "custom";

/**
 * Context passed to tool execution
 */
export interface ToolContext {
  teamId: string;
  userId: string;
  accessControl?: string[];
  conversationId?: string;
  executionId?: string;
  abortSignal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  metadata?: {
    executionTimeMs: number;
    tokensCost?: number;
    cached?: boolean;
  };
}

/**
 * Tool call from LLM
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  toolCallId: string;
  name: string;
  result: ToolResult;
}

/**
 * Tool registry interface
 */
export interface IToolRegistry {
  /** Register a tool */
  register<TParams extends Record<string, unknown>, TResult>(
    tool: ToolDefinition<TParams, TResult>
  ): void;

  /** Unregister a tool */
  unregister(name: string): void;

  /** Get a tool by name */
  get(name: string): ToolDefinition | undefined;

  /** List all registered tools */
  list(): ToolDefinition[];

  /** List tools by category */
  listByCategory(category: ToolCategory): ToolDefinition[];

  /** Execute a tool */
  execute(
    name: string,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult>;

  /** Execute multiple tool calls */
  executeMany(
    calls: ToolCall[],
    context: ToolContext
  ): Promise<ToolCallResult[]>;

  /** Convert tools to AI SDK format */
  toAISDKTools(): Record<string, unknown>;
}

/**
 * MCP tool definition (Model Context Protocol)
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, MCPPropertySchema>;
    required?: string[];
  };
}

/**
 * MCP property schema
 */
export interface MCPPropertySchema {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  items?: MCPPropertySchema;
  properties?: Record<string, MCPPropertySchema>;
}

/**
 * MCP server interface
 */
export interface IMCPServer {
  /** Server name */
  readonly name: string;

  /** Connect to the server */
  connect(): Promise<void>;

  /** Disconnect from the server */
  disconnect(): Promise<void>;

  /** Check if connected */
  isConnected(): boolean;

  /** List available tools */
  listTools(): Promise<MCPTool[]>;

  /** Execute a tool */
  executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}
