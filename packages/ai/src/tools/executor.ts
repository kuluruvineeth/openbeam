import {
  createExecutionEvent,
  generateCorrelationId,
  recordToolExecution,
  type ToolExecutionEvent,
} from "./observability";
import { toolRegistry } from "./registry";
import {
  defaultToolResilienceConfig,
  executeWithToolResilience,
  type ToolExecutionStats,
  type ToolResilienceConfig,
} from "./resilience";
import type { ToolContext, ToolExecutionResult, ToolMetadata } from "./types";

export interface ToolExecutorConfig {
  enableCache?: boolean;
  enableResilience?: boolean;
  enableObservability?: boolean;
  resilienceConfig?: ToolResilienceConfig;
  cacheKeyFn?: (toolName: string, params: unknown) => string | null;
  getCachedResult?: <T>(
    teamId: string,
    toolName: string,
    cacheKey: string
  ) => Promise<ToolExecutionResult<T> | null>;
  setCachedResult?: <T>(
    teamId: string,
    toolName: string,
    cacheKey: string,
    result: ToolExecutionResult<T>,
    ttlMs?: number
  ) => Promise<void>;
}

export interface ToolExecutorResult<T = unknown> {
  result: ToolExecutionResult<T>;
  cached: boolean;
  stats: ToolExecutionStats;
  event?: ToolExecutionEvent;
}

const defaultConfig: Required<
  Omit<ToolExecutorConfig, "cacheKeyFn" | "getCachedResult" | "setCachedResult">
> &
  Partial<
    Pick<
      ToolExecutorConfig,
      "cacheKeyFn" | "getCachedResult" | "setCachedResult"
    >
  > = {
  enableCache: true,
  enableResilience: true,
  enableObservability: true,
  resilienceConfig: defaultToolResilienceConfig,
};

export class ToolExecutor {
  private readonly config: typeof defaultConfig;

  constructor(config: ToolExecutorConfig = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Tool execution requires handling multiple scenarios
  async execute<TParams, TResult>(
    toolName: string,
    params: TParams,
    context: ToolContext
  ): Promise<ToolExecutorResult<TResult>> {
    const startTime = Date.now();
    const correlationId = context.correlationId ?? generateCorrelationId();
    const contextWithCorrelation = { ...context, correlationId };

    const registered = toolRegistry.get(toolName);
    if (!registered) {
      const errorResult: ToolExecutionResult<TResult> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Tool not found: ${toolName}`,
          retryable: false,
        },
      };
      return {
        result: errorResult,
        cached: false,
        stats: { retryAttempts: 0, circuitBreakerTrips: 0, totalLatencyMs: 0 },
      };
    }

    const { metadata, coreTool, cacheKeyFn: registeredCacheKeyFn } = registered;

    if (this.config.enableCache && this.config.getCachedResult) {
      const cacheKey = this.getCacheKey(toolName, params, registeredCacheKeyFn);
      if (cacheKey) {
        const cachedResult = await this.config.getCachedResult<TResult>(
          context.teamId,
          toolName,
          cacheKey
        );

        if (cachedResult) {
          const event = this.createAndRecordEvent({
            metadata,
            correlationId,
            context,
            startTime,
            result: cachedResult,
            cached: true,
          });

          return {
            result: cachedResult,
            cached: true,
            stats: {
              retryAttempts: 0,
              circuitBreakerTrips: 0,
              totalLatencyMs: Date.now() - startTime,
            },
            event,
          };
        }
      }
    }

    const executeCore = async (): Promise<ToolExecutionResult<TResult>> => {
      try {
        if (!coreTool.execute) {
          return {
            success: false,
            error: {
              code: "INTERNAL_ERROR",
              message: `Tool ${toolName} has no execute function`,
              retryable: false,
            },
            metadata: { latencyMs: Date.now() - startTime },
          };
        }

        const executionResult = (await coreTool.execute(params, {
          toolCallId: `exec_${Date.now()}`,
          messages: [],
          abortSignal: context.abortSignal,
        })) as ToolExecutionResult<TResult>;

        if (!executionResult.metadata) {
          executionResult.metadata = { latencyMs: Date.now() - startTime };
        }

        return executionResult;
      } catch (err) {
        return {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : "Unknown error",
            retryable: false,
          },
          metadata: { latencyMs: Date.now() - startTime },
        };
      }
    };

    let result: ToolExecutionResult<TResult>;
    let stats: ToolExecutionStats;

    if (this.config.enableResilience) {
      const resilientResult = await executeWithToolResilience(
        toolName,
        executeCore,
        contextWithCorrelation,
        this.config.resilienceConfig
      );
      result = resilientResult.result;
      stats = resilientResult.stats;
    } else {
      result = await executeCore();
      stats = {
        retryAttempts: 0,
        circuitBreakerTrips: 0,
        totalLatencyMs: Date.now() - startTime,
      };
    }

    if (
      this.config.enableCache &&
      this.config.setCachedResult &&
      result.success
    ) {
      const cacheKey = this.getCacheKey(toolName, params, registeredCacheKeyFn);
      if (cacheKey) {
        await this.config.setCachedResult(
          context.teamId,
          toolName,
          cacheKey,
          result,
          metadata.cacheTtlMs
        );
      }
    }

    toolRegistry.notifyExecute(toolName, params, result, stats.totalLatencyMs);

    const event = this.config.enableObservability
      ? this.createAndRecordEvent({
          metadata,
          correlationId,
          context,
          startTime,
          result,
          cached: false,
          retryAttempt: stats.retryAttempts,
        })
      : undefined;

    return { result, cached: false, stats, event };
  }

  private getCacheKey(
    toolName: string,
    params: unknown,
    toolCacheKeyFn?: (input: unknown) => string
  ): string | null {
    if (this.config.cacheKeyFn) {
      return this.config.cacheKeyFn(toolName, params);
    }
    if (toolCacheKeyFn) {
      return toolCacheKeyFn(params);
    }
    return null;
  }

  private createAndRecordEvent(options: {
    metadata: ToolMetadata;
    correlationId: string;
    context: ToolContext;
    startTime: number;
    result: ToolExecutionResult;
    cached: boolean;
    retryAttempt?: number;
  }): ToolExecutionEvent {
    const event = createExecutionEvent({
      toolName: options.metadata.name,
      category: options.metadata.category,
      correlationId: options.correlationId,
      parentSpanId: options.context.parentSpanId,
      teamId: options.context.teamId,
      userId: options.context.userId,
      startTime: options.startTime,
      result: options.result,
      cached: options.cached,
      retryAttempt: options.retryAttempt,
    });

    recordToolExecution(event);
    return event;
  }
}

export const defaultToolExecutor = new ToolExecutor();

export function createToolExecutor(config?: ToolExecutorConfig): ToolExecutor {
  return new ToolExecutor(config);
}

export function executeTool<TParams, TResult>(
  toolName: string,
  params: TParams,
  context: ToolContext,
  config?: ToolExecutorConfig
): Promise<ToolExecutorResult<TResult>> {
  const executor = config ? new ToolExecutor(config) : defaultToolExecutor;
  return executor.execute(toolName, params, context);
}
