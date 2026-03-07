import { createServer, type Server } from "node:http";
import prisma from "@openbeam/db";
import { getRedisClient } from "@openbeam/redis";
import { vespaClient } from "@openbeam/vespa";
import { Hono } from "hono";
import { Counter, Histogram } from "prom-client";
import { workerConfig } from "./config";
import { register } from "./metrics";
import logger from "./utils/logger";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks?: {
    redis?: { status: string; latency?: number };
    database?: { status: string; latency?: number };
    vespa?: { status: string; latency?: number };
  };
  error?: string;
}

let healthServer: Server | null = null;
const startTime = Date.now();
const healthCheckDurationSeconds = new Histogram({
  name: "worker_health_check_duration_seconds",
  help: "Duration of worker dependency health checks in seconds",
  labelNames: ["dependency", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});
const healthCheckFailuresTotal = new Counter({
  name: "worker_health_check_failures_total",
  help: "Total failed worker dependency health checks",
  labelNames: ["dependency"],
  registers: [register],
});
const healthEndpointDurationSeconds = new Histogram({
  name: "worker_health_endpoint_duration_seconds",
  help: "Duration of worker health endpoint responses in seconds",
  labelNames: ["endpoint", "status"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});
const healthEndpointFailuresTotal = new Counter({
  name: "worker_health_endpoint_failures_total",
  help: "Total failed worker health endpoint responses",
  labelNames: ["endpoint"],
  registers: [register],
});

type DependencyName = "redis" | "database" | "vespa";

function observeHealthEndpoint(
  endpoint: "/health/live" | "/health/ready" | "/health",
  statusCode: number,
  startedAt: bigint
): void {
  const status = statusCode >= 500 ? "failure" : "success";
  const latencySeconds =
    Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

  healthEndpointDurationSeconds.observe({ endpoint, status }, latencySeconds);

  if (statusCode >= 500) {
    healthEndpointFailuresTotal.inc({ endpoint });
  }
}

function observeDependencyCheck(
  dependency: DependencyName,
  status: "healthy" | "unhealthy",
  startedAt: bigint
): number {
  const latency = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  healthCheckDurationSeconds.observe({ dependency, status }, latency / 1000);

  if (status === "unhealthy") {
    healthCheckFailuresTotal.inc({ dependency });
  }

  return latency;
}

async function checkRedis(): Promise<{ status: string; latency?: number }> {
  const startedAt = process.hrtime.bigint();
  try {
    const client = await getRedisClient();
    await client.ping();
    const latency = observeDependencyCheck("redis", "healthy", startedAt);
    return { status: "healthy", latency };
  } catch (error) {
    observeDependencyCheck("redis", "unhealthy", startedAt);
    logger.warn({ error }, "Redis health check failed");
    return { status: "unhealthy" };
  }
}

async function checkDatabase(): Promise<{ status: string; latency?: number }> {
  const startedAt = process.hrtime.bigint();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = observeDependencyCheck("database", "healthy", startedAt);
    return { status: "healthy", latency };
  } catch (error) {
    observeDependencyCheck("database", "unhealthy", startedAt);
    logger.warn({ error }, "Database health check failed");
    return { status: "unhealthy" };
  }
}

async function checkVespa(): Promise<{ status: string; latency?: number }> {
  const startedAt = process.hrtime.bigint();
  try {
    const isHealthy = await vespaClient.healthCheck();
    const status = isHealthy ? "healthy" : "unhealthy";
    const latency = observeDependencyCheck("vespa", status, startedAt);
    return { status, latency };
  } catch (error) {
    observeDependencyCheck("vespa", "unhealthy", startedAt);
    logger.warn({ error }, "Vespa health check failed");
    return { status: "unhealthy" };
  }
}

function liveness(): HealthStatus {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
}

async function readiness(): Promise<HealthStatus> {
  try {
    const [redis, database, vespa] = await Promise.all([
      checkRedis(),
      checkDatabase(),
      checkVespa(),
    ]);

    const allHealthy =
      redis.status === "healthy" &&
      database.status === "healthy" &&
      vespa.status === "healthy";

    return {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks: { redis, database, vespa },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function startHealthServer(): Promise<void> {
  if (!workerConfig.health.enabled) {
    logger.info("Health server disabled");
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const app = new Hono();

    app.get("/health/live", (c) => {
      const startedAt = process.hrtime.bigint();
      const health = liveness();
      observeHealthEndpoint("/health/live", 200, startedAt);
      return c.json(health, 200);
    });

    app.get("/health/ready", async (c) => {
      const startedAt = process.hrtime.bigint();
      const health = await readiness();
      const statusCode = health.status === "healthy" ? 200 : 503;
      observeHealthEndpoint("/health/ready", statusCode, startedAt);
      return c.json(health, statusCode);
    });

    app.get("/health", async (c) => {
      const startedAt = process.hrtime.bigint();
      const health = await readiness();
      const statusCode = health.status === "healthy" ? 200 : 503;
      observeHealthEndpoint("/health", statusCode, startedAt);
      return c.json(health, statusCode);
    });

    healthServer = createServer(async (req, res) => {
      try {
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
      } catch (error) {
        logger.error({ error }, "Health endpoint error");
        res.statusCode = 500;
        res.end(JSON.stringify({ status: "error" }));
      }
    });

    healthServer.listen(workerConfig.health.port, () => {
      logger.info({ port: workerConfig.health.port }, "Health server started");
      resolve();
    });

    healthServer.on("error", reject);
  });
}

export function stopHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    if (healthServer) {
      healthServer.close(() => {
        logger.info("Health server stopped");
        healthServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
