export type MetricLabels = Record<string, string>;

function labelKey(labels?: MetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return "";
  }
  return JSON.stringify(
    Object.keys(labels)
      .sort()
      .reduce<Record<string, string>>((acc, k) => {
        acc[k] = labels[k] ?? "";
        return acc;
      }, {})
  );
}

export class InMemoryGauge {
  private readonly values = new Map<string, number>();
  readonly name: string;
  readonly help: string;
  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  set(value: number, labels?: MetricLabels): void {
    this.values.set(labelKey(labels), value);
  }

  inc(labels?: MetricLabels): void {
    const key = labelKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + 1);
  }

  dec(labels?: MetricLabels): void {
    const key = labelKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) - 1);
  }

  get(labels?: MetricLabels): number {
    return this.values.get(labelKey(labels)) ?? 0;
  }

  reset(): void {
    this.values.clear();
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.values);
  }
}

export class InMemoryCounter {
  private readonly values = new Map<string, number>();
  readonly name: string;
  readonly help: string;
  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  inc(labels?: MetricLabels, amount = 1): void {
    const key = labelKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + amount);
  }

  get(labels?: MetricLabels): number {
    return this.values.get(labelKey(labels)) ?? 0;
  }

  reset(): void {
    this.values.clear();
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.values);
  }
}

export class InMemoryHistogram {
  private readonly counts = new Map<string, number>();
  private readonly sums = new Map<string, number>();
  readonly name: string;
  readonly help: string;
  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  observe(value: number, labels?: MetricLabels): void {
    const key = labelKey(labels);
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    this.sums.set(key, (this.sums.get(key) ?? 0) + value);
  }

  getCount(labels?: MetricLabels): number {
    return this.counts.get(labelKey(labels)) ?? 0;
  }

  getSum(labels?: MetricLabels): number {
    return this.sums.get(labelKey(labels)) ?? 0;
  }

  reset(): void {
    this.counts.clear();
    this.sums.clear();
  }

  snapshot(): { counts: Record<string, number>; sums: Record<string, number> } {
    return {
      counts: Object.fromEntries(this.counts),
      sums: Object.fromEntries(this.sums),
    };
  }
}

export const swarmMetrics = {
  agentsActive: new InMemoryGauge(
    "mission_agents_active",
    "Currently active agents"
  ),
  spawnTotal: new InMemoryCounter("mission_spawn_total", "Total agent spawns"),
  spawnRejected: new InMemoryCounter(
    "mission_spawn_rejected",
    "Rejected spawn requests"
  ),
  messagesSent: new InMemoryCounter(
    "mission_messages_sent",
    "Total inter-agent messages"
  ),
  messageLatencyMs: new InMemoryHistogram(
    "mission_message_latency_ms",
    "Message delivery latency"
  ),
  llmCallDurationMs: new InMemoryHistogram(
    "mission_llm_call_duration_ms",
    "LLM call duration"
  ),
  llmCallErrors: new InMemoryCounter(
    "mission_llm_call_errors",
    "LLM call errors"
  ),
  budgetConsumedCents: new InMemoryGauge(
    "mission_budget_consumed_cents",
    "Budget consumed"
  ),
  reflectionScore: new InMemoryHistogram(
    "mission_reflection_score",
    "Agent reflection scores"
  ),
  heartbeatLag: new InMemoryHistogram(
    "mission_heartbeat_lag_ms",
    "Heartbeat timing deviation"
  ),
  messagesRateLimited: new InMemoryCounter(
    "mission_messages_rate_limited",
    "Rate-limited message attempts"
  ),
  messagesDeadLettered: new InMemoryCounter(
    "mission_messages_dead_lettered",
    "Messages moved to DLQ"
  ),
  messagesDeduplicated: new InMemoryCounter(
    "mission_messages_deduplicated",
    "Duplicate messages filtered"
  ),
  messagesReclaimed: new InMemoryCounter(
    "mission_messages_reclaimed",
    "Stale messages reclaimed"
  ),
  messagesReprocessed: new InMemoryCounter(
    "mission_messages_reprocessed",
    "DLQ messages reprocessed"
  ),
};

export function resetAllMetrics(): void {
  for (const metric of Object.values(swarmMetrics)) {
    metric.reset();
  }
}

export function snapshotMetrics(): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, metric] of Object.entries(swarmMetrics)) {
    result[key] = metric.snapshot();
  }
  return result;
}
