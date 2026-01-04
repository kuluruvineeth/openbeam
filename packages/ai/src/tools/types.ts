import type { Tool, ToolExecutionOptions } from "ai";
import type { z } from "zod";
import type { ToolServices } from "./services";

export type ToolCategory =
  | "search"
  | "rag"
  | "documents"
  | "connectors"
  | "data"
  | "media"
  | "browser"
  | "action"
  | "analysis"
  | "integration"
  | "system"
  | "skills";

export type ErrorCode =
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "TIMEOUT"
  | "INVALID_INPUT"
  | "INVALID_STATE"
  | "PROVIDER_ERROR"
  | "QUOTA_EXCEEDED"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

export type AllowedCaller = "agent" | "code_execution" | "mcp" | "api";

export interface ToolContext {
  teamId: string;
  userId: string;
  accessControl?: string[];
  conversationId?: string;
  sessionId?: string;
  executionId?: string;
  correlationId?: string;
  parentSpanId?: string;
  abortSignal?: AbortSignal;
  metadata?: Record<string, unknown>;
  services: ToolServices;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  metadata?: {
    latencyMs: number;
    tokenCount?: number;
    source?: string;
    cached?: boolean;
  };
}

export type AISDKTool = Tool<unknown, unknown>;

export interface ToolMetadata {
  name: string;
  description: string;
  category: ToolCategory;
  deferLoading?: boolean;
  searchKeywords?: string[];
  requiredPermissions?: string[];
  allowedCallers?: AllowedCaller[];
  cacheTtlMs?: number;
}

export interface RegisteredTool {
  metadata: ToolMetadata;
  coreTool: AISDKTool;
  cacheKeyFn?: (params: unknown) => string;
}

export interface ToolRegistryOptions {
  defaultContext?: Partial<ToolContext>;
}

export interface ToolMask {
  loaded?: string[];
  disabled?: string[];
}

export interface ToolBuilderOptions<TSchema extends z.ZodType, TResult> {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: TSchema;
  execute: (
    params: z.output<TSchema>,
    context: ToolContext
  ) => Promise<ToolExecutionResult<TResult>>;
  deferLoading?: boolean;
  searchKeywords?: string[];
  requiredPermissions?: string[];
  allowedCallers?: AllowedCaller[];
  cacheTtlMs?: number;
  cacheKeyFn?: (params: z.output<TSchema>) => string;
}

export type { ToolExecutionOptions };
