import { Counter, Histogram, Registry } from "prom-client";

export const sessionStreamRegistry = new Registry();

const publishTotal = new Counter({
  name: "session_stream_publish_total",
  help: "Total session stream publish events by payload type",
  labelNames: ["payload_type"] as const,
  registers: [sessionStreamRegistry],
});

const throttledTotal = new Counter({
  name: "session_stream_throttled_total",
  help: "Total throttled (dropped) session stream events",
  registers: [sessionStreamRegistry],
});

const subscriberParseFailuresTotal = new Counter({
  name: "session_stream_subscriber_parse_failures_total",
  help: "Total JSON/Zod parse failures in session stream subscriber",
  registers: [sessionStreamRegistry],
});

const publishDurationSeconds = new Histogram({
  name: "session_stream_publish_duration_seconds",
  help: "Duration of session stream publish operations in seconds",
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [sessionStreamRegistry],
});

const subscriberErrorsTotal = new Counter({
  name: "session_stream_subscriber_errors_total",
  help: "Total session stream subscriber connection errors",
  registers: [sessionStreamRegistry],
});

export function recordPublish(payloadType: string, durationMs: number): void {
  publishTotal.labels(payloadType).inc();
  publishDurationSeconds.observe(durationMs / 1000);
}

export function recordThrottled(): void {
  throttledTotal.inc();
}

export function recordParseFailure(): void {
  subscriberParseFailuresTotal.inc();
}

export function recordSubscriberError(): void {
  subscriberErrorsTotal.inc();
}

export async function getSessionStreamMetrics(): Promise<string> {
  return await sessionStreamRegistry.metrics();
}

export function getSessionStreamMetricsContentType(): string {
  return sessionStreamRegistry.contentType;
}
