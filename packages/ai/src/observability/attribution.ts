import type {
  CostBreakdown,
  ModelPricing,
  UsageEvent,
  UsageSummaryResult,
} from "@openplane/types/ai";
import {
  calculateModelCost,
  getModelPricing as getCentralizedPricing,
} from "@openplane/types/ai";

const DEFAULT_PRICING: ModelPricing = { inputPer1M: 1.0, outputPer1M: 5.0 };

const customPricing: Record<string, ModelPricing> = {};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  options?: {
    cacheTokens?: number;
    reasoningTokens?: number;
  }
): CostBreakdown {
  const result = calculateModelCost(model, inputTokens, outputTokens, options);

  if (result.totalCostUsd === 0) {
    const pricing = customPricing[model] ?? DEFAULT_PRICING;
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

  return {
    inputCostUsd: result.inputCostUsd,
    outputCostUsd: result.outputCostUsd,
    cacheCostUsd: 0,
    totalCostUsd: result.totalCostUsd,
  };
}

export function getModelPricing(model: string): ModelPricing {
  const centralized = getCentralizedPricing(model);
  if (centralized) {
    return centralized;
  }
  return customPricing[model] ?? DEFAULT_PRICING;
}

export function registerModelPricing(
  model: string,
  pricing: ModelPricing
): void {
  customPricing[model] = pricing;
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
