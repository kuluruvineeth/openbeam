import type {
  AllowedCaller,
  ApprovalPattern,
  ErrorCode,
  PermissionMode,
  PermissionModeConfig,
  ReversibilityLevel,
  StakesLevel,
  ToolCategory,
  ToolContextBase,
  ToolExecutionResult,
  ToolMetadata,
  ToolRiskProfile,
} from "@openbeam/types/ai";
import type { Tool, ToolExecutionOptions } from "ai";
import type { z } from "zod";
import type { MemoryAccess } from "../memory/access";
import type { ToolServices } from "./services";

export type { ToolExecutionOptions };

export type { ErrorCode } from "@openbeam/types/ai";

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
  FORBIDDEN: {
    description:
      "Access forbidden. Insufficient permissions for this operation.",
    retryable: false,
    defaultSuggestion:
      "Check your permissions or request elevated access from an administrator.",
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
  PAYMENT_REQUIRED: {
    description: "Payment required to use this tool.",
    retryable: false,
    defaultSuggestion:
      "Check billing status and use a valid X-PAYMENT header with signed authorization.",
  },
  BUDGET_EXCEEDED: {
    description: "Budget limit exceeded for this execution context.",
    retryable: false,
    defaultSuggestion:
      "Try reducing scope or request additional budget allocation.",
  },
};

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
      "computer",
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

export interface CanvasNode {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface CanvasStateAccess {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface ToolContext extends ToolContextBase {
  abortSignal?: AbortSignal;
  services: ToolServices;
  memory?: MemoryAccess;
  canvasState?: CanvasStateAccess;
}

export type AISDKTool = Tool<unknown, unknown>;

export interface RegisteredTool {
  metadata: ToolMetadata;
  coreTool: AISDKTool;
  cacheKeyFn?: (params: unknown) => string;
}

export interface ToolRegistryOptions {
  defaultContext?: Partial<ToolContext>;
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
  stakes?: StakesLevel;
  reversibility?: ReversibilityLevel;
  approval?: ApprovalPattern;
  riskProfile?: ToolRiskProfile;
}
