import type { Context } from "hono";
import type { SystemHealthResponse } from "./health.schema";

const healthCache = {
  data: null as SystemHealthResponse | null,
  timestamp: 0,
  TTL: 5000,
};

async function checkVespaHealth(): Promise<SystemHealthResponse["vespa"]> {
  try {
    const vespaUrl = process.env.VESPA_URL || "http://localhost:8080";
    const startTime = Date.now();

    const response = await fetch(`${vespaUrl}/state/v1/health`, {
      signal: AbortSignal.timeout(5000),
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

async function checkWorkerHealth(): Promise<SystemHealthResponse["worker"]> {
  try {
    const workerUrl = process.env.WORKER_METRICS_URL || "http://localhost:9091";

    const response = await fetch(`${workerUrl}/metrics`, {
      signal: AbortSignal.timeout(3000),
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

async function checkTemporalHealth(): Promise<
  NonNullable<SystemHealthResponse["temporal"]>
> {
  try {
    const temporalUrl = process.env.TEMPORAL_ADDRESS || "http://localhost:7233";

    const response = await fetch(`${temporalUrl}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      return { status: "healthy" };
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

export async function systemHealthHandler(c: Context) {
  try {
    const now = Date.now();
    if (healthCache.data && now - healthCache.timestamp < healthCache.TTL) {
      return c.json(healthCache.data, 200);
    }

    const [vespaHealth, workerHealth, temporalHealth] = await Promise.all([
      checkVespaHealth(),
      checkWorkerHealth(),
      checkTemporalHealth(),
    ]);

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (
      vespaHealth.status === "unhealthy" ||
      workerHealth.status === "unhealthy"
    ) {
      overallStatus = "unhealthy";
    } else if (temporalHealth.status === "unhealthy") {
      overallStatus = "degraded";
    }

    const healthData: SystemHealthResponse = {
      status: overallStatus,
      timestamp: now,
      vespa: vespaHealth,
      worker: workerHealth,
      temporal: temporalHealth,
    };

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
