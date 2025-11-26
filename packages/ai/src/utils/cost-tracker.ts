/**
 * Cost Tracker
 *
 * Tracks token usage and estimates costs for AI operations.
 */

/**
 * Model pricing (per 1K tokens)
 */
export interface ModelPricing {
  inputCost: number;
  outputCost: number;
}

/**
 * Default pricing for common models
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o": { inputCost: 0.0025, outputCost: 0.01 },
  "gpt-4o-mini": { inputCost: 0.000_15, outputCost: 0.0006 },
  "gpt-4-turbo": { inputCost: 0.01, outputCost: 0.03 },
  "gpt-4": { inputCost: 0.03, outputCost: 0.06 },
  "gpt-3.5-turbo": { inputCost: 0.0005, outputCost: 0.0015 },
  "text-embedding-3-small": { inputCost: 0.000_02, outputCost: 0 },
  "text-embedding-3-large": { inputCost: 0.000_13, outputCost: 0 },

  // Anthropic
  "claude-sonnet-4-20250514": { inputCost: 0.003, outputCost: 0.015 },
  "claude-3-5-sonnet-20241022": { inputCost: 0.003, outputCost: 0.015 },
  "claude-3-5-haiku-20241022": { inputCost: 0.0008, outputCost: 0.004 },
  "claude-3-opus-20240229": { inputCost: 0.015, outputCost: 0.075 },

  // Google (some are free in preview)
  "gemini-2.0-flash-exp": { inputCost: 0, outputCost: 0 },
  "gemini-1.5-pro": { inputCost: 0.001_25, outputCost: 0.005 },
  "gemini-1.5-flash": { inputCost: 0.000_075, outputCost: 0.0003 },
};

/**
 * Usage entry
 */
export interface UsageEntry {
  timestamp: number;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  metadata?: Record<string, unknown>;
}

/**
 * Usage summary
 */
export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byModel: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cost: number;
      count: number;
    }
  >;
  byOperation: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cost: number;
      count: number;
    }
  >;
}

/**
 * Cost Tracker class
 */
export class CostTracker {
  private entries: UsageEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = MODEL_PRICING[model] || {
      inputCost: 0.01,
      outputCost: 0.03,
    };
    return (
      (inputTokens / 1000) * pricing.inputCost +
      (outputTokens / 1000) * pricing.outputCost
    );
  }

  /**
   * Track a usage entry
   */
  track(
    model: string,
    operation: string,
    inputTokens: number,
    outputTokens: number,
    metadata?: Record<string, unknown>
  ): UsageEntry {
    const cost = this.calculateCost(model, inputTokens, outputTokens);

    const entry: UsageEntry = {
      timestamp: Date.now(),
      model,
      operation,
      inputTokens,
      outputTokens,
      cost,
      metadata,
    };

    this.entries.push(entry);

    // Trim if needed
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    return entry;
  }

  /**
   * Get usage summary
   */
  getSummary(since?: number): UsageSummary {
    const filtered = since
      ? this.entries.filter((e) => e.timestamp >= since)
      : this.entries;

    const summary: UsageSummary = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      byModel: {},
      byOperation: {},
    };

    for (const entry of filtered) {
      summary.totalInputTokens += entry.inputTokens;
      summary.totalOutputTokens += entry.outputTokens;
      summary.totalCost += entry.cost;

      // By model
      if (!summary.byModel[entry.model]) {
        summary.byModel[entry.model] = {
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          count: 0,
        };
      }
      summary.byModel[entry.model].inputTokens += entry.inputTokens;
      summary.byModel[entry.model].outputTokens += entry.outputTokens;
      summary.byModel[entry.model].cost += entry.cost;
      summary.byModel[entry.model].count += 1;

      // By operation
      if (!summary.byOperation[entry.operation]) {
        summary.byOperation[entry.operation] = {
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          count: 0,
        };
      }
      summary.byOperation[entry.operation].inputTokens += entry.inputTokens;
      summary.byOperation[entry.operation].outputTokens += entry.outputTokens;
      summary.byOperation[entry.operation].cost += entry.cost;
      summary.byOperation[entry.operation].count += 1;
    }

    return summary;
  }

  /**
   * Get entries for a time range
   */
  getEntries(since?: number, until?: number): UsageEntry[] {
    return this.entries.filter((e) => {
      if (since && e.timestamp < since) return false;
      if (until && e.timestamp > until) return false;
      return true;
    });
  }

  /**
   * Get total cost for a time range
   */
  getTotalCost(since?: number): number {
    return this.getSummary(since).totalCost;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Export entries as JSON
   */
  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Import entries from JSON
   */
  import(json: string): void {
    const imported = JSON.parse(json) as UsageEntry[];
    this.entries = [...this.entries, ...imported].slice(-this.maxEntries);
  }
}

/**
 * Global cost tracker instance
 */
export const costTracker = new CostTracker();

/**
 * Track usage
 */
export function trackUsage(
  model: string,
  operation: string,
  inputTokens: number,
  outputTokens: number,
  metadata?: Record<string, unknown>
): UsageEntry {
  return costTracker.track(
    model,
    operation,
    inputTokens,
    outputTokens,
    metadata
  );
}

/**
 * Get pricing for a model
 */
export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] || { inputCost: 0.01, outputCost: 0.03 };
}

export default costTracker;
