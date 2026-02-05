import { createServer, type Server } from "node:http";
import prisma from "@openplane/db";
import { getRedisClient } from "@openplane/redis";
import { vespaClient } from "@openplane/vespa";
import { Hono } from "hono";
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

let healthServer: Server | null = null;
const startTime = Date.now();

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

async function checkVespa(): Promise<{ status: string; latency?: number }> {
  try {
    const start = Date.now();
    const isHealthy = await vespaClient.healthCheck();
    const latency = Date.now() - start;
    return { status: isHealthy ? "healthy" : "unhealthy", latency };
  } catch (error) {
    logger.error({ error }, "Vespa health check failed");
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
      const health = liveness();
      return c.json(health, 200);
    });

    app.get("/health/ready", async (c) => {
      const health = await readiness();
      const statusCode = health.status === "healthy" ? 200 : 503;
      return c.json(health, statusCode);
    });

    app.get("/health", async (c) => {
      const health = await readiness();
      const statusCode = health.status === "healthy" ? 200 : 503;
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
