import { createServer, type Server } from "node:http";
import { Hono } from "hono";
import {
  Counter,
  collectDefaultMetrics,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";
import { workerConfig } from "./config";
import logger from "./utils/logger";

export const register = new Registry();
const WORKER_STATUS_LABELS = ["worker_type", "task_queue", "status"] as const;
const WORKER_CONNECTION_LABELS = ["worker_type", "status"] as const;
let defaultMetricsCollected = false;

export const syncJobsTotal = new Counter({
  name: "sync_jobs_total",
  help: "Total number of sync jobs processed",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const syncDocumentsTotal = new Counter({
  name: "sync_documents_total",
  help: "Total number of documents synced",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const syncDuration = new Histogram({
  name: "sync_duration_seconds",
  help: "Sync job duration in seconds",
  labelNames: WORKER_STATUS_LABELS,
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register],
});

export const syncQueueDepth = new Gauge({
  name: "sync_queue_depth",
  help: "Number of jobs in sync queue",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const indexJobsTotal = new Counter({
  name: "index_jobs_total",
  help: "Total number of index jobs processed",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const indexDocumentsTotal = new Counter({
  name: "index_documents_total",
  help: "Total number of documents indexed",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const indexDuration = new Histogram({
  name: "index_duration_seconds",
  help: "Index job duration in seconds",
  labelNames: WORKER_STATUS_LABELS,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const indexQueueDepth = new Gauge({
  name: "index_queue_depth",
  help: "Number of jobs in index queue",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const indexThroughput = new Gauge({
  name: "index_throughput_docs_per_second",
  help: "Indexing throughput in documents per second",
  labelNames: ["worker_type", "task_queue"],
  registers: [register],
});

export const indexErrorsTotal = new Counter({
  name: "index_errors_total",
  help: "Total number of indexing errors",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const rateLimitHitsTotal = new Counter({
  name: "rate_limit_hits_total",
  help: "Total number of rate limit hits",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const rateLimitWaits = new Histogram({
  name: "rate_limit_waits_seconds",
  help: "Time spent waiting for rate limit quota",
  labelNames: WORKER_STATUS_LABELS,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

export const fenceConflictsTotal = new Counter({
  name: "fence_conflicts_total",
  help: "Total number of fence conflicts (duplicate execution attempts)",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const fenceAcquisitions = new Counter({
  name: "fence_acquisitions_total",
  help: "Total number of fence acquisitions",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const checksumSkipRate = new Gauge({
  name: "checksum_skip_rate",
  help: "Percentage of documents skipped due to unchanged checksums",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const checksumSkipsTotal = new Counter({
  name: "checksum_skips_total",
  help: "Total number of documents skipped (unchanged)",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const webhookEventsTotal = new Counter({
  name: "webhook_events_total",
  help: "Total number of webhook events received",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const webhookDuplicatesTotal = new Counter({
  name: "webhook_duplicates_total",
  help: "Total number of duplicate webhook events",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const cleanupDocumentsTotal = new Counter({
  name: "cleanup_documents_total",
  help: "Total number of documents cleaned up",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const cleanupDuration = new Histogram({
  name: "cleanup_duration_seconds",
  help: "Cleanup job duration in seconds",
  labelNames: WORKER_STATUS_LABELS,
  buckets: [10, 30, 60, 120, 300, 600, 1800],
  registers: [register],
});

export const queueProcessingLag = new Gauge({
  name: "queue_processing_lag_seconds",
  help: "Time between job creation and processing",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const scheduledJobsTotal = new Gauge({
  name: "scheduled_jobs_total",
  help: "Number of repeatable scheduled jobs",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const rateLimitUsage = new Gauge({
  name: "rate_limit_usage_ratio",
  help: "Rate limit usage ratio (0-1)",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

export const redisConnectionsTotal = new Gauge({
  name: "redis_connections_total",
  help: "Total number of Redis connections",
  labelNames: WORKER_CONNECTION_LABELS,
  registers: [register],
});

export const redisConnectionStatus = new Gauge({
  name: "redis_connection_status",
  help: "Redis connection status (1 = connected, 0 = disconnected)",
  labelNames: WORKER_CONNECTION_LABELS,
  registers: [register],
});

export const executionEventsPublished = new Counter({
  name: "execution_events_published_total",
  help: "Total execution events published",
  labelNames: WORKER_STATUS_LABELS,
  registers: [register],
});

let metricsServer: Server | null = null;

function ensureDefaultMetrics(): void {
  if (defaultMetricsCollected) {
    return;
  }

  collectDefaultMetrics({
    register,
    labels: {
      service: "openbeam-worker",
    },
  });
  defaultMetricsCollected = true;
}

export function startMetricsServer(): Promise<void> {
  if (!workerConfig.metrics.enabled) {
    logger.info("Metrics server disabled");
    return Promise.resolve();
  }

  ensureDefaultMetrics();

  return new Promise((resolve, reject) => {
    const app = new Hono();

    app.get("/metrics", async (c) => {
      c.header("Content-Type", register.contentType);
      return c.body(await register.metrics());
    });

    metricsServer = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const request = new Request(url.toString(), {
        method: req.method,
        headers: req.headers as Record<string, string>,
      });
      const response = await app.fetch(request);
      res.statusCode = response.status;
      for (const [key, value] of response.headers) {
        res.setHeader(key, value);
      }
      const body = await response.text();
      res.end(body);
    });

    metricsServer.listen(workerConfig.metrics.port, () => {
      logger.info(
        { port: workerConfig.metrics.port },
        "Metrics server started"
      );
      resolve();
    });

    metricsServer.on("error", reject);
  });
}

export function stopMetricsServer(): Promise<void> {
  return new Promise((resolve) => {
    if (metricsServer) {
      metricsServer.close(() => {
        logger.info("Metrics server stopped");
        metricsServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
