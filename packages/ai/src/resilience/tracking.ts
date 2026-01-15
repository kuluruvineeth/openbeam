import type {
  CostEstimate,
  ModelUsageSummary,
  ProviderUsageSummary,
  UsageRecord,
} from "@openplane/types/ai";
import { calculateModelCost, getModelPricing } from "@openplane/types/ai";
import type { ErrorCode, TokenUsage, UsageSummary } from "./types";

export interface ModelPricing {
  inputCostPer1M: number;
  outputCostPer1M: number;
  cachedInputCostPer1M?: number;
}

export function estimateCost(
  _providerId: string,
  modelId: string,
  tokens: TokenUsage
): CostEstimate {
  const pricing = getModelPricing(modelId);

  if (!pricing) {
    return { inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0 };
  }

  const result = calculateModelCost(
    modelId,
    tokens.inputTokens,
    tokens.outputTokens,
    { cacheTokens: tokens.cachedTokens }
  );

  return {
    inputCostUsd: result.inputCostUsd,
    outputCostUsd: result.outputCostUsd,
    totalCostUsd: result.totalCostUsd,
  };
}

export interface UsageTrackerOptions {
  maxRecords?: number;
  flushIntervalMs?: number;
  onFlush?: (records: UsageRecord[]) => Promise<void>;
}

interface RecordFilter {
  teamId?: string;
  userId?: string;
  providerId?: string;
  modelId?: string;
  startTime?: number;
  endTime?: number;
}

function matchesFilter(record: UsageRecord, filter: RecordFilter): boolean {
  if (filter.teamId && record.teamId !== filter.teamId) {
    return false;
  }
  if (filter.userId && record.userId !== filter.userId) {
    return false;
  }
  if (filter.providerId && record.providerId !== filter.providerId) {
    return false;
  }
  if (filter.modelId && record.modelId !== filter.modelId) {
    return false;
  }
  if (filter.startTime && record.timestamp < filter.startTime) {
    return false;
  }
  if (filter.endTime && record.timestamp > filter.endTime) {
    return false;
  }
  return true;
}

export class UsageTracker {
  private records: UsageRecord[] = [];
  private readonly maxRecords: number;
  private readonly onFlush?: (records: UsageRecord[]) => Promise<void>;
  private flushTimer?: ReturnType<typeof setInterval>;
  private recordCounter = 0;

  constructor(options: UsageTrackerOptions = {}) {
    this.maxRecords = options.maxRecords ?? 10_000;
    this.onFlush = options.onFlush;

    if (options.flushIntervalMs && options.onFlush) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(() => {
          // Silently ignore flush errors to avoid crashing the interval
        });
      }, options.flushIntervalMs);
    }
  }

  record(params: {
    providerId: string;
    modelId: string;
    teamId: string;
    userId?: string;
    workflow?: string;
    operation: string;
    tokens: TokenUsage;
    durationMs: number;
    success: boolean;
    errorCode?: ErrorCode;
  }): UsageRecord {
    this.recordCounter += 1;
    const id = `usage_${this.recordCounter}_${Date.now()}`;
    const cost = estimateCost(params.providerId, params.modelId, params.tokens);

    const record: UsageRecord = { id, timestamp: Date.now(), ...params, cost };

    this.records.push(record);

    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    return record;
  }

  getRecords(filter?: RecordFilter): UsageRecord[] {
    if (!filter) {
      return [...this.records];
    }
    return this.records.filter((record) => matchesFilter(record, filter));
  }

  getSummary(filter?: RecordFilter): UsageSummary {
    const records = this.getRecords(filter);

    const byProvider = new Map<string, ProviderUsageSummary>();
    const byModel = new Map<string, ModelUsageSummary>();

    let totalTokens: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
    let totalCostUsd = 0;
    let totalDurationMs = 0;
    let successfulRequests = 0;

    for (const record of records) {
      totalTokens = {
        inputTokens: totalTokens.inputTokens + record.tokens.inputTokens,
        outputTokens: totalTokens.outputTokens + record.tokens.outputTokens,
        totalTokens: totalTokens.totalTokens + record.tokens.totalTokens,
      };
      totalCostUsd += record.cost.totalCostUsd;
      totalDurationMs += record.durationMs;

      if (record.success) {
        successfulRequests += 1;
      }

      this.updateProviderSummary(byProvider, record);
      this.updateModelSummary(byModel, record);
    }

    return {
      totalRequests: records.length,
      successfulRequests,
      failedRequests: records.length - successfulRequests,
      totalTokens,
      totalCostUsd,
      averageDurationMs:
        records.length > 0 ? totalDurationMs / records.length : 0,
      byProvider,
      byModel,
    };
  }

  private updateProviderSummary(
    map: Map<string, ProviderUsageSummary>,
    record: UsageRecord
  ): void {
    const existing = map.get(record.providerId);

    if (existing) {
      existing.requests += 1;
      existing.tokens = {
        inputTokens: existing.tokens.inputTokens + record.tokens.inputTokens,
        outputTokens: existing.tokens.outputTokens + record.tokens.outputTokens,
        totalTokens: existing.tokens.totalTokens + record.tokens.totalTokens,
      };
      existing.costUsd += record.cost.totalCostUsd;
      existing.successRate =
        (existing.successRate * (existing.requests - 1) +
          (record.success ? 1 : 0)) /
        existing.requests;
    } else {
      map.set(record.providerId, {
        providerId: record.providerId,
        requests: 1,
        tokens: { ...record.tokens },
        costUsd: record.cost.totalCostUsd,
        successRate: record.success ? 1 : 0,
      });
    }
  }

  private updateModelSummary(
    map: Map<string, ModelUsageSummary>,
    record: UsageRecord
  ): void {
    const key = `${record.providerId}:${record.modelId}`;
    const existing = map.get(key);

    if (existing) {
      existing.requests += 1;
      existing.tokens = {
        inputTokens: existing.tokens.inputTokens + record.tokens.inputTokens,
        outputTokens: existing.tokens.outputTokens + record.tokens.outputTokens,
        totalTokens: existing.tokens.totalTokens + record.tokens.totalTokens,
      };
      existing.costUsd += record.cost.totalCostUsd;
      existing.averageDurationMs =
        (existing.averageDurationMs * (existing.requests - 1) +
          record.durationMs) /
        existing.requests;
    } else {
      map.set(key, {
        modelId: record.modelId,
        providerId: record.providerId,
        requests: 1,
        tokens: { ...record.tokens },
        costUsd: record.cost.totalCostUsd,
        averageDurationMs: record.durationMs,
      });
    }
  }

  async flush(): Promise<UsageRecord[]> {
    if (this.records.length === 0 || !this.onFlush) {
      return [];
    }

    const toFlush = [...this.records];
    this.records = [];

    try {
      await this.onFlush(toFlush);
      return toFlush;
    } catch (err) {
      this.records = [...toFlush, ...this.records].slice(0, this.maxRecords);
      throw err;
    }
  }

  clear(): void {
    this.records = [];
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }
}

export interface AttributionContext {
  teamId: string;
  userId?: string;
  workflow?: string;
  operation: string;
}

export function createUsageTracker(
  options?: UsageTrackerOptions
): UsageTracker {
  return new UsageTracker(options);
}

export const globalUsageTracker = new UsageTracker();

export function trackUsage(
  ctx: AttributionContext,
  params: {
    providerId: string;
    modelId: string;
    tokens: TokenUsage;
    durationMs: number;
    success: boolean;
    errorCode?: ErrorCode;
  }
): UsageRecord {
  return globalUsageTracker.record({ ...ctx, ...params });
}

export function getUsageSummary(filter?: RecordFilter): UsageSummary {
  return globalUsageTracker.getSummary(filter);
}
