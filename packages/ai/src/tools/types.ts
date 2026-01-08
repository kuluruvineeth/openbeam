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

export interface ToolError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  suggestion?: string;
  details?: Record<string, unknown>;
}

export const ERROR_CODES: Record<
  ErrorCode,
  { description: string; retryable: boolean; defaultSuggestion: string }
> = {
  RATE_LIMITED: {
    description: "Too many requests. API rate limit exceeded.",
    retryable: true,
    defaultSuggestion: "Wait a moment and try again with fewer requests.",
  },
  UNAUTHORIZED: {
    description: "Authentication failed or insufficient permissions.",
    retryable: false,
    defaultSuggestion: "Check your API credentials or request access.",
  },
  NOT_FOUND: {
    description: "The requested resource was not found.",
    retryable: false,
    defaultSuggestion: "Verify the resource ID or search for alternatives.",
  },
  TIMEOUT: {
    description: "The operation timed out.",
    retryable: true,
    defaultSuggestion: "Try again with a smaller scope or simpler query.",
  },
  INVALID_INPUT: {
    description: "The input parameters are invalid.",
    retryable: false,
    defaultSuggestion: "Check the parameter values and try again.",
  },
  INVALID_STATE: {
    description: "The operation is not valid in the current state.",
    retryable: false,
    defaultSuggestion: "Check the current state and prerequisites.",
  },
  PROVIDER_ERROR: {
    description: "An error occurred with the external service provider.",
    retryable: true,
    defaultSuggestion: "Try again later or use an alternative provider.",
  },
  QUOTA_EXCEEDED: {
    description: "Usage quota has been exceeded.",
    retryable: false,
    defaultSuggestion: "Wait until the quota resets or upgrade your plan.",
  },
  NETWORK_ERROR: {
    description: "A network error occurred.",
    retryable: true,
    defaultSuggestion: "Check network connectivity and try again.",
  },
  INTERNAL_ERROR: {
    description: "An unexpected internal error occurred.",
    retryable: true,
    defaultSuggestion: "Try again. If the issue persists, report it.",
  },
};

export type AllowedCaller = "agent" | "code_execution" | "mcp" | "api";

export type PermissionMode = "default" | "readOnly" | "elevated" | "plan";

export interface PermissionModeConfig {
  allowedCategories: ToolCategory[];
  allowedTools?: string[];
  deniedTools?: string[];
  requiresApproval?: boolean;
  canWrite: boolean;
  canExecute: boolean;
  canAccessExternal: boolean;
}

export const PERMISSION_MODE_CONFIGS: Record<
  PermissionMode,
  PermissionModeConfig
> = {
  default: {
    allowedCategories: ["search", "rag", "documents", "data", "analysis"],
    canWrite: false,
    canExecute: false,
    canAccessExternal: true,
  },
  readOnly: {
    allowedCategories: ["search", "rag", "documents", "data"],
    deniedTools: ["syncConnector", "updateDocument", "deleteDocument"],
    canWrite: false,
    canExecute: false,
    canAccessExternal: false,
  },
  elevated: {
    allowedCategories: [
      "search",
      "rag",
      "documents",
      "connectors",
      "data",
      "media",
      "action",
      "analysis",
      "integration",
      "system",
    ],
    requiresApproval: true,
    canWrite: true,
    canExecute: true,
    canAccessExternal: true,
  },
  plan: {
    allowedCategories: ["search", "rag", "documents", "data", "analysis"],
    canWrite: false,
    canExecute: false,
    canAccessExternal: true,
  },
};

export interface WebPermissionConfig {
  mode: PermissionMode;
  userId: string;
  teamId: string;
  customAllowedTools?: string[];
  customDeniedTools?: string[];
  approvalCallback?: (toolName: string, params: unknown) => Promise<boolean>;
}

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

export interface ToolResultMetadata {
  latencyMs: number;
  tokenCount?: number;
  source?: string;
  cached?: boolean;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolError;
  metadata?: ToolResultMetadata;
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
