import type { ToolCategory, ToolExecutionResult } from "@openbeam/types/ai";
import type { ErrorCode } from "./types";

export interface ToolExecutionEvent {
  toolName: string;
  category: ToolCategory;
  correlationId: string;
  parentSpanId?: string;
  spanId: string;
  teamId: string;
  userId?: string;
  timestamp: number;
  durationMs: number;
  success: boolean;
  cached: boolean;
  errorCode?: ErrorCode;
  tokenCount?: number;
  retryAttempt?: number;
}

export interface ToolMetricsSnapshot {
  toolName: string;
  category: ToolCategory;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cachedExecutions: number;
  totalLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  avgLatencyMs: number;
  errorsByCode: Map<ErrorCode, number>;
  lastExecutionAt: number;
}

export type ToolEventListener = (event: ToolExecutionEvent) => void;

export type MetricsExporter = (
  metrics: Map<string, ToolMetricsSnapshot>
) => Promise<void>;

class ToolMetricsCollector {
  private readonly executionsByTool = new Map<string, ToolExecutionEvent[]>();
  private readonly listeners: ToolEventListener[] = [];
  private readonly maxEventsPerTool: number;
  private exportTimer?: ReturnType<typeof setInterval>;
  private metricsExporter?: MetricsExporter;

  constructor(maxEventsPerTool = 1000) {
    this.maxEventsPerTool = maxEventsPerTool;
  }

  recordExecution(event: ToolExecutionEvent): void {
    const events = this.executionsByTool.get(event.toolName) ?? [];
    events.push(event);

    if (events.length > this.maxEventsPerTool) {
      events.shift();
    }

    this.executionsByTool.set(event.toolName, events);
    this.notifyListeners(event);
  }

  onEvent(listener: ToolEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(event: ToolExecutionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listeners should not throw
      }
    }
  }

  getMetrics(toolName: string): ToolMetricsSnapshot | undefined {
    const events = this.executionsByTool.get(toolName);
    if (!events?.length) {
      return;
    }

    const latencies = events.map((e) => e.durationMs).sort((a, b) => a - b);
    const errorsByCode = new Map<ErrorCode, number>();

    let successful = 0;
    let cached = 0;

    for (const event of events) {
      if (event.success) {
        successful += 1;
      }
      if (event.cached) {
        cached += 1;
      }
      if (event.errorCode) {
        errorsByCode.set(
          event.errorCode,
          (errorsByCode.get(event.errorCode) ?? 0) + 1
        );
      }
    }

    const totalLatency = latencies.reduce((sum, l) => sum + l, 0);
    const lastEvent = events.at(-1);

    return {
      toolName,
      category: lastEvent?.category ?? "search",
      totalExecutions: events.length,
      successfulExecutions: successful,
      failedExecutions: events.length - successful,
      cachedExecutions: cached,
      totalLatencyMs: totalLatency,
      p50LatencyMs: this.percentile(latencies, 0.5),
      p95LatencyMs: this.percentile(latencies, 0.95),
      p99LatencyMs: this.percentile(latencies, 0.99),
      avgLatencyMs: totalLatency / events.length,
      errorsByCode,
      lastExecutionAt: lastEvent?.timestamp ?? 0,
    };
  }

  getAllMetrics(): Map<string, ToolMetricsSnapshot> {
    const result = new Map<string, ToolMetricsSnapshot>();

    for (const toolName of this.executionsByTool.keys()) {
      const metrics = this.getMetrics(toolName);
      if (metrics) {
        result.set(toolName, metrics);
      }
    }

    return result;
  }

  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) {
      return 0;
    }
    const index = Math.ceil(p * sortedArr.length) - 1;
    return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))] ?? 0;
  }

  setExporter(exporter: MetricsExporter, intervalMs = 60_000): void {
    this.metricsExporter = exporter;
    this.exportTimer = setInterval(() => {
      this.exportMetrics().catch(() => {
        // Silently ignore export errors to avoid crashing the interval
      });
    }, intervalMs);
  }

  private async exportMetrics(): Promise<void> {
    if (!this.metricsExporter) {
      return;
    }
    try {
      await this.metricsExporter(this.getAllMetrics());
    } catch {
      // Exporter should not crash the system
    }
  }

  clear(): void {
    this.executionsByTool.clear();
  }

  destroy(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = undefined;
    }
    this.listeners.length = 0;
  }
}

export const toolMetrics = new ToolMetricsCollector();

let spanCounter = 0;

export function generateSpanId(): string {
  spanCounter += 1;
  return `span_${Date.now().toString(36)}_${spanCounter.toString(36)}`;
}

export function generateCorrelationId(): string {
  return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createExecutionEvent(params: {
  toolName: string;
  category: ToolCategory;
  correlationId: string;
  parentSpanId?: string;
  teamId: string;
  userId?: string;
  startTime: number;
  result: ToolExecutionResult;
  cached?: boolean;
  retryAttempt?: number;
}): ToolExecutionEvent {
  const now = Date.now();

  return {
    toolName: params.toolName,
    category: params.category,
    correlationId: params.correlationId,
    parentSpanId: params.parentSpanId,
    spanId: generateSpanId(),
    teamId: params.teamId,
    userId: params.userId,
    timestamp: now,
    durationMs: now - params.startTime,
    success: params.result.success,
    cached: params.cached ?? params.result.metadata?.cached ?? false,
    errorCode: params.result.error?.code,
    tokenCount: params.result.metadata?.tokenCount,
    retryAttempt: params.retryAttempt,
  };
}

export function recordToolExecution(event: ToolExecutionEvent): void {
  toolMetrics.recordExecution(event);
}

export { ToolMetricsCollector };
