import type {
  AllowedCaller,
  ApprovalPattern,
  ErrorCode,
  ReversibilityLevel,
  StakesLevel,
  ToolCategory,
  ToolExecutionResult,
  ToolMetadata,
  ToolResultMetadata,
  ToolRiskProfile,
} from "@openplane/types/ai";
import { tool } from "ai";
import type { z } from "zod";
import { toolRegistry } from "./registry";
import {
  type AISDKTool,
  ERROR_CODES,
  type ToolContext,
  type ToolExecutionOptions,
} from "./types";

interface ToolConfig<TParams extends z.ZodType, TResult> {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: TParams;
  execute: (
    params: z.output<TParams>,
    context: ToolContext
  ) => ToolExecutionResult<TResult> | Promise<ToolExecutionResult<TResult>>;
  deferLoading?: boolean;
  searchKeywords?: string[];
  requiredPermissions?: string[];
  allowedCallers?: AllowedCaller[];
  cacheTtlMs?: number;
  cacheKeyFn?: (params: z.output<TParams>) => string;
  strict?: boolean;
  stakes?: StakesLevel;
  reversibility?: ReversibilityLevel;
  approval?: ApprovalPattern;
}

export interface ToolDefinition<TParams extends z.ZodType, TResult> {
  metadata: ToolMetadata;
  coreTool: AISDKTool;
  execute: (
    params: z.output<TParams>,
    context: ToolContext
  ) => Promise<ToolExecutionResult<TResult>>;
  register: () => void;
}

export function deriveApprovalPattern(
  stakes: StakesLevel,
  reversibility: ReversibilityLevel,
  explicit?: ApprovalPattern
): ApprovalPattern {
  if (explicit) {
    return explicit;
  }

  if (stakes === "low" && reversibility === "easy") {
    return "auto";
  }
  if (stakes === "low" && reversibility === "hard") {
    return "quick-confirm";
  }
  if (stakes === "high" && reversibility === "easy") {
    return "suggest-apply";
  }
  if (stakes === "high") {
    return "explicit";
  }
  if (stakes === "medium" && reversibility === "irreversible") {
    return "explicit";
  }
  return "quick-confirm";
}

export function defineTool<TParams extends z.ZodType, TResult>(
  config: ToolConfig<TParams, TResult>
): ToolDefinition<TParams, TResult> {
  const stakes = config.stakes ?? "low";
  const reversibility = config.reversibility ?? "easy";
  const approval = deriveApprovalPattern(
    stakes,
    reversibility,
    config.approval
  );

  const riskProfile: ToolRiskProfile | undefined =
    config.stakes || config.reversibility || config.approval
      ? { stakes, reversibility, approval }
      : undefined;

  const metadata: ToolMetadata = {
    name: config.name,
    description: config.description,
    category: config.category,
    deferLoading: config.deferLoading ?? false,
    searchKeywords: config.searchKeywords ?? [],
    requiredPermissions: config.requiredPermissions ?? [],
    allowedCallers: config.allowedCallers ?? ["agent", "mcp"],
    cacheTtlMs: config.cacheTtlMs,
    riskProfile,
  };

  const coreTool = tool({
    description: config.description,
    inputSchema: config.parameters,
    strict: config.strict,
    execute: async (
      params: z.output<TParams>,
      _options: ToolExecutionOptions
    ): Promise<ToolExecutionResult<TResult>> => {
      const ctx = toolRegistry.getCurrentContext();
      const startTime = performance.now();

      let result: ToolExecutionResult<TResult>;
      try {
        result = await config.execute(params, ctx);
      } catch (error) {
        const durationMs = performance.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result = {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: errorMessage,
            retryable: true,
          },
          metadata: { latencyMs: durationMs },
        } as ToolExecutionResult<TResult>;

        toolRegistry.notifyExecute(config.name, params, result, durationMs);
        return result;
      }

      const durationMs = performance.now() - startTime;

      if (result.metadata) {
        result.metadata.latencyMs = durationMs;
      } else {
        result.metadata = { latencyMs: durationMs };
      }

      toolRegistry.notifyExecute(config.name, params, result, durationMs);

      return result;
    },
  });

  return {
    metadata,
    coreTool: coreTool as AISDKTool,
    execute: async (params: z.output<TParams>, ctx: ToolContext) =>
      await Promise.resolve(config.execute(params, ctx)),
    register: () => {
      toolRegistry.register(
        metadata,
        coreTool as AISDKTool,
        config.cacheKeyFn as ((params: unknown) => string) | undefined
      );
    },
  };
}

export function success<T>(
  data: T,
  metadata?: Partial<ToolExecutionResult<T>["metadata"]>
): ToolExecutionResult<T> {
  return {
    success: true,
    data,
    metadata: { latencyMs: 0, ...metadata },
  };
}

export function failure(
  code: ErrorCode,
  message?: string,
  options?: {
    retryable?: boolean;
    suggestion?: string;
    details?: Record<string, unknown>;
    metadata?: Partial<ToolResultMetadata>;
  }
): ToolExecutionResult<never> {
  const errorInfo = ERROR_CODES[code];
  return {
    success: false,
    error: {
      code,
      message: message ?? errorInfo.description,
      retryable: options?.retryable ?? errorInfo.retryable,
      suggestion: options?.suggestion ?? errorInfo.defaultSuggestion,
      details: options?.details,
    },
    metadata: options?.metadata
      ? { latencyMs: options.metadata.latencyMs ?? 0, ...options.metadata }
      : undefined,
  };
}

export function createSuccessResult<T>(
  data: T,
  metadata?: Partial<ToolResultMetadata>
): ToolExecutionResult<T> {
  return success(data, metadata);
}

export function createErrorResult<T = unknown>(
  code: ErrorCode,
  message?: string,
  options?: {
    suggestion?: string;
    details?: Record<string, unknown>;
    metadata?: Partial<ToolResultMetadata>;
  }
): ToolExecutionResult<T> {
  return failure(code, message, options) as ToolExecutionResult<T>;
}

export type { ErrorCode, ToolExecutionResult };
