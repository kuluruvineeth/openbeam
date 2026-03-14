import { OpenAPIHono } from "@hono/zod-openapi";
import { createRequestContextMiddleware } from "@openbeam/observability";
import { cors } from "hono/cors";
import { httpRequestDurationSeconds } from "@/metrics";
import { apiKeyAuth } from "@/middleware/api-key";
import type { AuthEnv } from "@/middleware/auth";
import { sessionMiddleware } from "@/middleware/auth";
import {
  getMergedMetrics,
  getMergedMetricsContentType,
} from "@/observability/metrics-registry";
import logger from "@/utils/logger";
import { defaultHook } from "./default-hook";

export function createApp() {
  const webUrl = process.env.WEB_URL || "http://localhost:3001";
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

  const app = new OpenAPIHono<AuthEnv>({
    strict: false,
    defaultHook,
  });

  app.use(
    "*",
    createRequestContextMiddleware({
      requestIdHeader: "x-request-id",
      skipPaths: ["/metrics"],
    })
  );
  const allowedOrigins = Array.from(
    new Set([
      webUrl,
      serverUrl,
      "http://localhost:3000",
      "http://localhost:3001",
    ])
  );

  app.use(
    "/api/v1/public/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Request-Id"],
      credentials: false,
    })
  );

  app.use(
    "/*",
    cors({
      origin: allowedOrigins,
      allowMethods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE", "PUT"],
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "Cookie",
        "X-Request-Id",
        "x-request-id",
        "x-openbeam-team",
      ],
      credentials: true,
    })
  );

  app.use("*", async (c, next) => {
    const start = process.hrtime.bigint();
    try {
      await next();
    } finally {
      if (c.req.path !== "/metrics") {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        logger.info(
          {
            method: c.req.method,
            path: c.req.path,
            status_code: c.res.status,
            duration_ms: Number(durationMs.toFixed(2)),
          },
          "request_completed"
        );
      }
    }
  });

  app.use("*", async (c, next) => {
    const start = process.hrtime.bigint();
    try {
      await next();
    } finally {
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      const route = c.req.path;
      httpRequestDurationSeconds.observe(
        {
          method: c.req.method,
          route,
          status_code: String(c.res.status),
        },
        duration
      );
    }
  });

  app.get("/metrics", async (c) => {
    c.header("Content-Type", getMergedMetricsContentType());
    return c.body(await getMergedMetrics());
  });

  app.use("/api/*", apiKeyAuth);
  app.use("/api/*", sessionMiddleware);
  app.use("/integrations/*", apiKeyAuth);
  app.use("/integrations/*", sessionMiddleware);

  return app;
}
