import {
  getIndexQueueMetrics,
  getSyncQueueMetrics,
  getWebhookQueueMetrics,
} from "@openplane/redis";
import type { Context } from "hono";
import logger from "@/utils/logger";
import type { SystemHealthResponse } from "./health.schema";

// Simple in-memory cache for health checks (5 second TTL)
const healthCache = {
  data: null as SystemHealthResponse | null,
  timestamp: 0,
  TTL: 5000, // 5 seconds
};

/**
 * Check Vespa health
 */
async function checkVespaHealth(): Promise<SystemHealthResponse["vespa"]> {
  try {
    const vespaUrl = process.env.VESPA_URL || "http://localhost:8080";
    const startTime = Date.now();

    const response = await fetch(`${vespaUrl}/state/v1/health`, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: "healthy",
        latency_ms: latency,
      };
    }
    return {
      status: "unhealthy",
      latency_ms: latency,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check worker health (via metrics endpoint)
 */
async function checkWorkerHealth(): Promise<SystemHealthResponse["worker"]> {
  try {
    const workerUrl = process.env.WORKER_METRICS_URL || "http://localhost:9091";

    const response = await fetch(`${workerUrl}/metrics`, {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (response.ok) {
      return {
        status: "healthy",
      };
    }
    return {
      status: "unhealthy",
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * System health handler
 * Returns overall system health including queues, Vespa, and worker status
 */
export async function systemHealthHandler(c: Context) {
  try {
    // Check cache first
    const now = Date.now();
    if (healthCache.data && now - healthCache.timestamp < healthCache.TTL) {
      return c.json(healthCache.data, 200);
    }

    // Fetch fresh health data
    const [
      syncMetrics,
      indexMetrics,
      webhookMetrics,
      vespaHealth,
      workerHealth,
    ] = await Promise.all([
      getSyncQueueMetrics(),
      getIndexQueueMetrics(),
      getWebhookQueueMetrics(),
      checkVespaHealth(),
      checkWorkerHealth(),
    ]);

    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    // Check if any queue has too many failed jobs
    const totalFailed =
      syncMetrics.failed + indexMetrics.failed + webhookMetrics.failed;
    if (totalFailed > 10) {
      overallStatus = "degraded";
    }

    // Check if any queue has too much backlog
    const totalWaiting = syncMetrics.waiting + indexMetrics.waiting;
    if (totalWaiting > 100) {
      overallStatus = "degraded";
    }

    // Check if Vespa or worker is unhealthy
    if (
      vespaHealth.status === "unhealthy" ||
      workerHealth.status === "unhealthy"
    ) {
      overallStatus = "unhealthy";
    }

    const healthData: SystemHealthResponse = {
      status: overallStatus,
      timestamp: now,
      queues: {
        sync: {
          waiting: syncMetrics.waiting,
          active: syncMetrics.active,
          failed: syncMetrics.failed,
          delayed: syncMetrics.delayed,
        },
        index: {
          waiting: indexMetrics.waiting,
          active: indexMetrics.active,
          failed: indexMetrics.failed,
          delayed: indexMetrics.delayed,
        },
        webhook: {
          waiting: webhookMetrics.waiting,
          active: webhookMetrics.active,
          failed: webhookMetrics.failed,
        },
      },
      vespa: vespaHealth,
      worker: workerHealth,
    };

    // Update cache
    healthCache.data = healthData;
    healthCache.timestamp = now;

    return c.json(healthData, 200);
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
