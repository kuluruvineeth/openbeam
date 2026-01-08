import { tool } from "ai";
import type { z } from "zod";
import { toolRegistry } from "./registry";
import {
  type AISDKTool,
  type AllowedCaller,
  ERROR_CODES,
  type ErrorCode,
  type ToolCategory,
  type ToolContext,
  type ToolExecutionOptions,
  type ToolExecutionResult,
  type ToolMetadata,
  type ToolResultMetadata,
} from "./types";

interface ToolConfig<TParams extends z.ZodType, TResult> {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: TParams;
  execute: (
    params: z.output<TParams>,
    context: ToolContext
  ) => Promise<ToolExecutionResult<TResult>>;
  deferLoading?: boolean;
  searchKeywords?: string[];
  requiredPermissions?: string[];
  allowedCallers?: AllowedCaller[];
  cacheTtlMs?: number;
  cacheKeyFn?: (params: z.output<TParams>) => string;
  strict?: boolean;
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

export function defineTool<TParams extends z.ZodType, TResult>(
  config: ToolConfig<TParams, TResult>
): ToolDefinition<TParams, TResult> {
  const metadata: ToolMetadata = {
    name: config.name,
    description: config.description,
    category: config.category,
    deferLoading: config.deferLoading ?? false,
    searchKeywords: config.searchKeywords ?? [],
    requiredPermissions: config.requiredPermissions ?? [],
    allowedCallers: config.allowedCallers ?? ["agent", "mcp"],
    cacheTtlMs: config.cacheTtlMs,
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

      const result = await config.execute(params, ctx);

      if (result.metadata) {
        result.metadata.latencyMs = performance.now() - startTime;
      } else {
        result.metadata = { latencyMs: performance.now() - startTime };
      }

      return result;
    },
  });

  return {
    metadata,
    coreTool: coreTool as AISDKTool,
    execute: config.execute,
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
