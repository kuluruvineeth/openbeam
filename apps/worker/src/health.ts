/**
 * Health Check Server
 *
 * HTTP endpoints for Kubernetes liveness and readiness probes.
 */

import prisma from "@openplane/db";
import { getRedisClient } from "@openplane/redis";
import { vespaClient } from "@openplane/vespa";
import { Hono } from "hono";
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

let healthServer: ReturnType<typeof Bun.serve> | null = null;
const startTime = Date.now();

/**
 * Check Redis health
 */
async function checkRedis(): Promise<{ status: string; latency?: number }> {
  try {
    const start = Date.now();
    const client = await getRedisClient();
    await client.ping();
    const latency = Date.now() - start;
    return { status: "healthy", latency };
  } catch (error) {
    logger.error({ error }, "Redis health check failed");
    return { status: "unhealthy" };
  }
}

/**
 * Check Database health
 */
async function checkDatabase(): Promise<{ status: string; latency?: number }> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return { status: "healthy", latency };
  } catch (error) {
    logger.error({ error }, "Database health check failed");
    return { status: "unhealthy" };
  }
}

/**
 * Check Vespa health
 */
async function checkVespa(): Promise<{ status: string; latency?: number }> {
  try {
    const start = Date.now();
    await vespaClient.search({ query: "test", limit: 1 });
    const latency = Date.now() - start;
    return { status: "healthy", latency };
  } catch (error) {
    logger.error({ error }, "Vespa health check failed");
    return { status: "unhealthy" };
  }
}

/**
 * Liveness probe - worker is running
 */
function liveness(): HealthStatus {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
}

/**
 * Readiness probe - worker is ready to handle requests
 */
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

/**
 * Start health check server
 */
export function startHealthServer(): Promise<void> {
  if (!workerConfig.health.enabled) {
    logger.info("Health server disabled");
    return Promise.resolve();
  }

  const app = new Hono();

  // Liveness probe
  app.get("/health/live", (c) => {
    const health = liveness();
    return c.json(health, 200);
  });

  // Readiness probe
  app.get("/health/ready", async (c) => {
    const health = await readiness();
    const statusCode = health.status === "healthy" ? 200 : 503;
    return c.json(health, statusCode);
  });

  // Combined health check
  app.get("/health", async (c) => {
    const health = await readiness();
    const statusCode = health.status === "healthy" ? 200 : 503;
    return c.json(health, statusCode);
  });

  healthServer = Bun.serve({
    port: workerConfig.health.port,
    fetch: app.fetch,
  });

  logger.info({ port: workerConfig.health.port }, "Health server started");
  return Promise.resolve();
}

/**
 * Stop health check server
 */
export function stopHealthServer(): Promise<void> {
  if (healthServer) {
    healthServer.stop();
    logger.info("Health server stopped");
    healthServer = null;
  }
  return Promise.resolve();
}
