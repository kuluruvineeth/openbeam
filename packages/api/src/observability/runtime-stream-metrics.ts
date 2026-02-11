import { Counter, Gauge, Histogram, Registry } from "prom-client";

export const apiStreamRegistry = new Registry();

export const sessionStreamConnectionsTotal = new Counter({
  name: "session_stream_connections_total",
  help: "Total subscription connections",
  registers: [apiStreamRegistry],
});

export const sessionStreamActiveConnections = new Gauge({
  name: "session_stream_active_connections",
  help: "Currently active subscription connections",
  registers: [apiStreamRegistry],
});

export const sessionStreamReplayDurationSeconds = new Histogram({
  name: "session_stream_replay_duration_seconds",
  help: "Latency to fetch and replay missed events on reconnect",
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 1.5, 2, 5],
  registers: [apiStreamRegistry],
});

export const sessionStreamReplayEventsTotal = new Counter({
  name: "session_stream_replay_events_total",
  help: "Total events replayed on reconnect",
  registers: [apiStreamRegistry],
});

export const sessionStreamEventsYieldedTotal = new Counter({
  name: "session_stream_events_yielded_total",
  help: "Total events yielded to client",
  labelNames: ["source"] as const,
  registers: [apiStreamRegistry],
});

export const sessionStreamDisconnectionsTotal = new Counter({
  name: "session_stream_disconnections_total",
  help: "Total subscription disconnections",
  registers: [apiStreamRegistry],
});

export const sessionStreamSequenceGapsTotal = new Counter({
  name: "session_stream_sequence_gaps_total",
  help: "Sequence gap detections",
  registers: [apiStreamRegistry],
});

export function recordSessionStreamConnect(): void {
  sessionStreamConnectionsTotal.inc();
  sessionStreamActiveConnections.inc();
}

export function recordSessionStreamDisconnect(): void {
  sessionStreamDisconnectionsTotal.inc();
  sessionStreamActiveConnections.dec();
}

export function recordReplay(durationMs: number, eventCount: number): void {
  sessionStreamReplayDurationSeconds.observe(durationMs / 1000);
  sessionStreamReplayEventsTotal.inc(eventCount);
}

export function recordEventYielded(source: "replay" | "live"): void {
  sessionStreamEventsYieldedTotal.labels(source).inc();
}

export function recordSequenceGap(): void {
  sessionStreamSequenceGapsTotal.inc();
}

export async function getApiStreamMetrics(): Promise<string> {
  return await apiStreamRegistry.metrics();
}

export function getApiStreamMetricsContentType(): string {
  return apiStreamRegistry.contentType;
}
