/**
 * Health Check Server
 * 
 * HTTP endpoints for Kubernetes liveness and readiness probes.
 */

import prisma from "@openplane/db";
import { getRedisClient } from "@openplane/redis";
import { vespaClient } from "@openplane/vespa";
import { workerConfig } from "./config";
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

let healthServer: any = null;
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
async function liveness(): Promise<HealthStatus> {
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
export async function startHealthServer(): Promise<void> {
  if (!workerConfig.health.enabled) {
    logger.info("Health server disabled");
    return;
  }

  const { default: express } = await import("express");
  const app = express();

  // Liveness probe
  app.get("/health/live", async (req, res) => {
    const health = await liveness();
    res.status(200).json(health);
  });

  // Readiness probe
  app.get("/health/ready", async (req, res) => {
    const health = await readiness();
    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Combined health check
  app.get("/health", async (req, res) => {
    const health = await readiness();
    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  healthServer = app.listen(workerConfig.health.port, () => {
    logger.info({ port: workerConfig.health.port }, "Health server started");
  });
}

/**
 * Stop health check server
 */
export async function stopHealthServer(): Promise<void> {
  if (healthServer) {
    await new Promise<void>((resolve) => {
      healthServer.close(() => {
        logger.info("Health server stopped");
        resolve();
      });
    });
    healthServer = null;
  }
}

