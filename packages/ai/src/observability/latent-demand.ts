import { Counter, Histogram } from "prom-client";
import { z } from "zod";
import { aiMetricsRegistry } from "./metrics";

export const LatentDemandReasonSchema = z.enum([
  "no_tool",
  "insufficient_context",
  "low_confidence",
  "rate_limited",
  "authorization_denied",
  "capability_limit",
  "timeout",
  "unknown",
]);

export type LatentDemandReason = z.infer<typeof LatentDemandReasonSchema>;

export const LatentDemandEventSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  sessionId: z.string().optional(),
  query: z.string(),
  queryCategory: z.string().optional(),
  failureReason: LatentDemandReasonSchema,
  suggestedCapability: z.string().optional(),
  attemptedTools: z.array(z.string()).default([]),
  partialProgress: z.number().min(0).max(1).optional(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LatentDemandEvent = z.infer<typeof LatentDemandEventSchema>;

export interface LatentDemandSummary {
  totalUnfulfilled: number;
  byReason: Record<LatentDemandReason, number>;
  topSuggestedCapabilities: Array<{
    capability: string;
    count: number;
  }>;
  topFailedQueries: Array<{
    queryPattern: string;
    count: number;
    reasons: LatentDemandReason[];
  }>;
}

const latentDemandTotal = new Counter({
  name: "openbeam_ai_latent_demand_total",
  help: "Total unfulfilled agent requests",
  labelNames: ["team_id", "reason"] as const,
  registers: [aiMetricsRegistry],
});

const latentDemandByCategory = new Counter({
  name: "openbeam_ai_latent_demand_by_category_total",
  help: "Unfulfilled requests by query category",
  labelNames: ["team_id", "category", "reason"] as const,
  registers: [aiMetricsRegistry],
});

const suggestedCapabilityFrequency = new Counter({
  name: "openbeam_ai_suggested_capability_frequency_total",
  help: "Frequency of suggested capabilities",
  labelNames: ["capability"] as const,
  registers: [aiMetricsRegistry],
});

const partialProgressHistogram = new Histogram({
  name: "openbeam_ai_latent_demand_partial_progress",
  help: "Partial progress achieved before failure",
  labelNames: ["reason"] as const,
  buckets: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0],
  registers: [aiMetricsRegistry],
});

type LatentDemandCallback = (event: LatentDemandEvent) => void;

class LatentDemandLogger {
  private events: LatentDemandEvent[] = [];
  private readonly maxEventHistory: number;
  private readonly callbacks: Set<LatentDemandCallback> = new Set();

  constructor(maxEventHistory = 10_000) {
    this.maxEventHistory = maxEventHistory;
  }

  log(input: unknown): void {
    const event = LatentDemandEventSchema.parse(input);

    this.events.push(event);
    if (this.events.length > this.maxEventHistory) {
      this.events.shift();
    }

    latentDemandTotal.inc({
      team_id: event.teamId,
      reason: event.failureReason,
    });

    if (event.queryCategory) {
      latentDemandByCategory.inc({
        team_id: event.teamId,
        category: event.queryCategory,
        reason: event.failureReason,
      });
    }

    if (event.suggestedCapability) {
      suggestedCapabilityFrequency.inc({
        capability: event.suggestedCapability,
      });
    }

    if (event.partialProgress !== undefined) {
      partialProgressHistogram.observe(
        { reason: event.failureReason },
        event.partialProgress
      );
    }

    for (const callback of this.callbacks) {
      callback(event);
    }
  }

  onEvent(callback: LatentDemandCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  getSummary(
    options: { teamId?: string; since?: number; limit?: number } = {}
  ): LatentDemandSummary {
    const { teamId, since, limit = 100 } = options;

    let filtered = this.events;

    if (teamId) {
      filtered = filtered.filter((e) => e.teamId === teamId);
    }

    if (since) {
      filtered = filtered.filter((e) => e.timestamp >= since);
    }

    const byReason: Record<LatentDemandReason, number> = {
      no_tool: 0,
      insufficient_context: 0,
      low_confidence: 0,
      rate_limited: 0,
      authorization_denied: 0,
      capability_limit: 0,
      timeout: 0,
      unknown: 0,
    };

    const capabilityCounts = new Map<string, number>();
    const queryPatternCounts = new Map<
      string,
      { count: number; reasons: Set<LatentDemandReason> }
    >();

    for (const event of filtered) {
      byReason[event.failureReason] += 1;

      if (event.suggestedCapability) {
        const current = capabilityCounts.get(event.suggestedCapability) ?? 0;
        capabilityCounts.set(event.suggestedCapability, current + 1);
      }

      const pattern = this.extractQueryPattern(event.query);
      const existing = queryPatternCounts.get(pattern);
      if (existing) {
        existing.count += 1;
        existing.reasons.add(event.failureReason);
      } else {
        queryPatternCounts.set(pattern, {
          count: 1,
          reasons: new Set([event.failureReason]),
        });
      }
    }

    const topSuggestedCapabilities = Array.from(capabilityCounts.entries())
      .map(([capability, count]) => ({ capability, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    const topFailedQueries = Array.from(queryPatternCounts.entries())
      .map(([queryPattern, data]) => ({
        queryPattern,
        count: data.count,
        reasons: Array.from(data.reasons),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return {
      totalUnfulfilled: filtered.length,
      byReason,
      topSuggestedCapabilities,
      topFailedQueries,
    };
  }

  getRecentEvents(limit = 100): LatentDemandEvent[] {
    return this.events.slice(-limit).reverse();
  }

  clear(): void {
    this.events = [];
  }

  private extractQueryPattern(query: string): string {
    const normalized = query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const words = normalized.split(" ").slice(0, 5);
    return words.join(" ") + (normalized.split(" ").length > 5 ? "..." : "");
  }
}

let globalLogger: LatentDemandLogger | null = null;

export function getLatentDemandLogger(): LatentDemandLogger {
  if (!globalLogger) {
    globalLogger = new LatentDemandLogger();
  }
  return globalLogger;
}

export function logLatentDemand(event: LatentDemandEvent): void {
  getLatentDemandLogger().log(event);
}

export function createLatentDemandEvent(params: {
  teamId: string;
  userId: string;
  query: string;
  reason: LatentDemandReason;
  sessionId?: string;
  queryCategory?: string;
  suggestedCapability?: string;
  attemptedTools?: string[];
  partialProgress?: number;
  metadata?: Record<string, unknown>;
}): LatentDemandEvent {
  return {
    teamId: params.teamId,
    userId: params.userId,
    sessionId: params.sessionId,
    query: params.query,
    queryCategory: params.queryCategory,
    failureReason: params.reason,
    suggestedCapability: params.suggestedCapability,
    attemptedTools: params.attemptedTools ?? [],
    partialProgress: params.partialProgress,
    timestamp: Date.now(),
    metadata: params.metadata,
  };
}

export { LatentDemandLogger };
