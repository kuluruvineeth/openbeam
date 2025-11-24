/**
 * Prometheus Metrics
 *
 * Comprehensive metrics for worker performance monitoring.
 */

import { Hono } from "hono";
import { Counter, Gauge, Histogram, Registry } from "prom-client";
import { workerConfig } from "./config";
import logger from "./utils/logger";

// Bun global type
declare const Bun: {
  serve(options: {
    port: number;
    fetch: (req: Request) => Response | Promise<Response>;
  }): {
    stop(): void;
  };
};

// Create a registry
export const register = new Registry();

// Sync Metrics
export const syncJobsTotal = new Counter({
  name: "sync_jobs_total",
  help: "Total number of sync jobs processed",
  labelNames: ["connector_id", "type", "status"],
  registers: [register],
});

export const syncDocumentsTotal = new Counter({
  name: "sync_documents_total",
  help: "Total number of documents synced",
  labelNames: ["connector_id"],
  registers: [register],
});

export const syncDuration = new Histogram({
  name: "sync_duration_seconds",
  help: "Sync job duration in seconds",
  labelNames: ["connector_id", "type"],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register],
});

export const syncQueueDepth = new Gauge({
  name: "sync_queue_depth",
  help: "Number of jobs in sync queue",
  labelNames: ["status"],
  registers: [register],
});

// Index Metrics
export const indexJobsTotal = new Counter({
  name: "index_jobs_total",
  help: "Total number of index jobs processed",
  labelNames: ["connector_id", "status"],
  registers: [register],
});

export const indexDocumentsTotal = new Counter({
  name: "index_documents_total",
  help: "Total number of documents indexed",
  labelNames: ["connector_id"],
  registers: [register],
});

export const indexDuration = new Histogram({
  name: "index_duration_seconds",
  help: "Index job duration in seconds",
  labelNames: ["connector_id"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const indexQueueDepth = new Gauge({
  name: "index_queue_depth",
  help: "Number of jobs in index queue",
  labelNames: ["status"],
  registers: [register],
});

export const indexThroughput = new Gauge({
  name: "index_throughput_docs_per_second",
  help: "Indexing throughput in documents per second",
  registers: [register],
});

export const indexErrorsTotal = new Counter({
  name: "index_errors_total",
  help: "Total number of indexing errors",
  labelNames: ["connector_id", "error_type"],
  registers: [register],
});

// Rate Limiting Metrics
export const rateLimitHitsTotal = new Counter({
  name: "rate_limit_hits_total",
  help: "Total number of rate limit hits",
  labelNames: ["connector_id", "limit_type"],
  registers: [register],
});

export const rateLimitWaits = new Histogram({
  name: "rate_limit_waits_seconds",
  help: "Time spent waiting for rate limit quota",
  labelNames: ["connector_id"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// Fencing Metrics
export const fenceConflictsTotal = new Counter({
  name: "fence_conflicts_total",
  help: "Total number of fence conflicts (duplicate execution attempts)",
  labelNames: ["connector_id"],
  registers: [register],
});

export const fenceAcquisitions = new Counter({
  name: "fence_acquisitions_total",
  help: "Total number of fence acquisitions",
  labelNames: ["connector_id"],
  registers: [register],
});

// Deduplication Metrics
export const checksumSkipRate = new Gauge({
  name: "checksum_skip_rate",
  help: "Percentage of documents skipped due to unchanged checksums",
  labelNames: ["connector_id"],
  registers: [register],
});

export const checksumSkipsTotal = new Counter({
  name: "checksum_skips_total",
  help: "Total number of documents skipped (unchanged)",
  labelNames: ["connector_id"],
  registers: [register],
});

// Webhook Metrics
export const webhookEventsTotal = new Counter({
  name: "webhook_events_total",
  help: "Total number of webhook events received",
  labelNames: ["source", "event_type", "status"],
  registers: [register],
});

export const webhookDuplicatesTotal = new Counter({
  name: "webhook_duplicates_total",
  help: "Total number of duplicate webhook events",
  labelNames: ["source"],
  registers: [register],
});

// Cleanup Metrics
export const cleanupDocumentsTotal = new Counter({
  name: "cleanup_documents_total",
  help: "Total number of documents cleaned up",
  labelNames: ["type"],
  registers: [register],
});

export const cleanupDuration = new Histogram({
  name: "cleanup_duration_seconds",
  help: "Cleanup job duration in seconds",
  buckets: [10, 30, 60, 120, 300, 600, 1800],
  registers: [register],
});

// System Metrics
export const queueProcessingLag = new Gauge({
  name: "queue_processing_lag_seconds",
  help: "Time between job creation and processing",
  labelNames: ["queue"],
  registers: [register],
});

// Scheduled Jobs Metrics
export const scheduledJobsTotal = new Gauge({
  name: "scheduled_jobs_total",
  help: "Number of repeatable scheduled jobs",
  labelNames: ["queue"],
  registers: [register],
});

// Rate Limit Usage Metrics
export const rateLimitUsage = new Gauge({
  name: "rate_limit_usage_ratio",
  help: "Rate limit usage ratio (0-1)",
  labelNames: ["connector_id", "window"],
  registers: [register],
});

// Metrics server
let metricsServer: ReturnType<typeof Bun.serve> | null = null;

export function startMetricsServer(): Promise<void> {
  if (!workerConfig.metrics.enabled) {
    logger.info("Metrics server disabled");
    return Promise.resolve();
  }

  const app = new Hono();

  app.get("/metrics", async (c) => {
    c.header("Content-Type", register.contentType);
    return c.body(await register.metrics());
  });

  metricsServer = Bun.serve({
    port: workerConfig.metrics.port,
    fetch: app.fetch,
  });

  logger.info({ port: workerConfig.metrics.port }, "Metrics server started");
  return Promise.resolve();
}

export function stopMetricsServer(): Promise<void> {
  if (metricsServer) {
    metricsServer.stop();
    logger.info("Metrics server stopped");
    metricsServer = null;
  }
  return Promise.resolve();
}
