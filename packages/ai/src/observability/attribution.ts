import type {
  CostBreakdown,
  ModelPricing,
  UsageEvent,
  UsageSummaryResult,
} from "./types";

const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-5-20251101": {
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cachePer1M: 1.5,
  },
  "claude-opus-4-20250514": {
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cachePer1M: 1.5,
  },
  "claude-sonnet-4-20250514": {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cachePer1M: 0.3,
  },
  "claude-haiku-3-5-20241022": {
    inputPer1M: 0.25,
    outputPer1M: 1.25,
    cachePer1M: 0.025,
  },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0 },
  o1: { inputPer1M: 15.0, outputPer1M: 60.0, reasoningPer1M: 60.0 },
  "o1-mini": { inputPer1M: 3.0, outputPer1M: 12.0, reasoningPer1M: 12.0 },
  "o3-mini": { inputPer1M: 1.1, outputPer1M: 4.4, reasoningPer1M: 4.4 },
  "gemini-2.0-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "text-embedding-3-large": { inputPer1M: 0.13, outputPer1M: 0 },
  "text-embedding-3-small": { inputPer1M: 0.02, outputPer1M: 0 },
  "text-embedding-004": { inputPer1M: 0.025, outputPer1M: 0 },
};

const DEFAULT_PRICING: ModelPricing = { inputPer1M: 1.0, outputPer1M: 5.0 };

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  options?: {
    cacheTokens?: number;
    reasoningTokens?: number;
  }
): CostBreakdown {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;

  const inputCostUsd = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCostUsd = (outputTokens / 1_000_000) * pricing.outputPer1M;

  let cacheCostUsd = 0;
  if (options?.cacheTokens && pricing.cachePer1M) {
    cacheCostUsd = (options.cacheTokens / 1_000_000) * pricing.cachePer1M;
  }

  let reasoningCostUsd = 0;
  if (options?.reasoningTokens && pricing.reasoningPer1M) {
    reasoningCostUsd =
      (options.reasoningTokens / 1_000_000) * pricing.reasoningPer1M;
  }

  return {
    inputCostUsd,
    outputCostUsd,
    cacheCostUsd,
    totalCostUsd:
      inputCostUsd + outputCostUsd + cacheCostUsd + reasoningCostUsd,
  };
}

export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}

export function registerModelPricing(
  model: string,
  pricing: ModelPricing
): void {
  MODEL_PRICING[model] = pricing;
}

export interface UsageLogCreateData {
  traceId: string;
  parentSpanId?: string;
  teamId: string;
  userId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  cacheCostUsd: number;
  totalCostUsd: number;
  latencyMs: number;
  firstTokenMs?: number;
  workflow?: string;
  feature?: string;
  operation?: string;
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageLogRepository {
  create(data: UsageLogCreateData): Promise<void>;
  findMany(params: {
    teamId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<UsageLogCreateData[]>;
}

export class CostAttributionService {
  private readonly repository: UsageLogRepository;
  private readonly buffer: UsageLogCreateData[] = [];
  private readonly bufferSize: number;
  private flushPromise: Promise<void> | null = null;

  constructor(
    repository: UsageLogRepository,
    options?: { bufferSize?: number }
  ) {
    this.repository = repository;
    this.bufferSize = options?.bufferSize ?? 100;
  }

  async recordUsage(event: UsageEvent): Promise<void> {
    const costs = calculateCost(
      event.model,
      event.inputTokens,
      event.outputTokens,
      {
        cacheTokens: event.cacheReadTokens,
        reasoningTokens: event.reasoningTokens,
      }
    );

    const data: UsageLogCreateData = {
      traceId: event.traceId,
      parentSpanId: event.parentSpanId,
      teamId: event.teamId,
      userId: event.userId,
      provider: event.provider,
      model: event.model,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      cacheReadTokens: event.cacheReadTokens ?? 0,
      cacheWriteTokens: event.cacheWriteTokens ?? 0,
      reasoningTokens: event.reasoningTokens ?? 0,
      inputCostUsd: costs.inputCostUsd,
      outputCostUsd: costs.outputCostUsd,
      cacheCostUsd: costs.cacheCostUsd,
      totalCostUsd: costs.totalCostUsd,
      latencyMs: event.latencyMs,
      firstTokenMs: event.firstTokenMs,
      workflow: event.workflow,
      feature: event.feature,
      operation: event.operation,
      success: event.success ?? true,
      errorCode: event.errorCode,
      metadata: event.metadata,
    };

    this.buffer.push(data);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    if (this.flushPromise) {
      await this.flushPromise;
      return;
    }

    const toFlush = [...this.buffer];
    this.buffer.length = 0;

    this.flushPromise = this.flushBatch(toFlush);
    await this.flushPromise;
    this.flushPromise = null;
  }

  private async flushBatch(records: UsageLogCreateData[]): Promise<void> {
    const promises = records.map((record) => this.repository.create(record));
    await Promise.all(promises);
  }

  async getUsageSummary(
    teamId: string,
    period: { start: Date; end: Date }
  ): Promise<UsageSummaryResult> {
    const logs = await this.repository.findMany({
      teamId,
      startDate: period.start,
      endDate: period.end,
    });

    const costByProvider: Record<string, number> = {};
    const costByModel: Record<string, number> = {};
    const costByUser: Record<string, number> = {};
    const costByWorkflow: Record<string, number> = {};
    let totalCostUsd = 0;
    let totalLatencyMs = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    for (const log of logs) {
      totalCostUsd += log.totalCostUsd;
      totalLatencyMs += log.latencyMs;

      if (log.success) {
        successfulRequests += 1;
      } else {
        failedRequests += 1;
      }

      costByProvider[log.provider] =
        (costByProvider[log.provider] ?? 0) + log.totalCostUsd;
      costByModel[log.model] = (costByModel[log.model] ?? 0) + log.totalCostUsd;

      if (log.userId) {
        costByUser[log.userId] =
          (costByUser[log.userId] ?? 0) + log.totalCostUsd;
      }

      if (log.workflow) {
        costByWorkflow[log.workflow] =
          (costByWorkflow[log.workflow] ?? 0) + log.totalCostUsd;
      }
    }

    return {
      totalRequests: logs.length,
      successfulRequests,
      failedRequests,
      totalCostUsd,
      costByProvider,
      costByModel,
      costByUser,
      costByWorkflow,
      avgLatencyMs: logs.length > 0 ? totalLatencyMs / logs.length : 0,
    };
  }
}

export function createCostAttributionService(
  repository: UsageLogRepository,
  options?: { bufferSize?: number }
): CostAttributionService {
  return new CostAttributionService(repository, options);
}
