import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
  httpRequestDurationSeconds,
  register as metricsRegister,
} from "@/metrics";
import { apiKeyAuth } from "@/middleware/api-key";
import type { AuthEnv } from "@/middleware/auth";
import { sessionMiddleware } from "@/middleware/auth";
import { defaultHook } from "./default-hook";

export function createApp() {
  const webUrl = process.env.WEB_URL || "http://localhost:3001";
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

  const app = new OpenAPIHono<AuthEnv>({
    strict: false,
    defaultHook,
  });

  // Middleware
  app.use(logger());
  const allowedOrigins = Array.from(
    new Set([
      webUrl,
      serverUrl,
      "http://localhost:3000",
      "http://localhost:3001",
    ])
  );

  app.use(
    "/*",
    cors({
      origin: allowedOrigins,
      allowMethods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE", "PUT"],
      allowHeaders: ["Content-Type", "Authorization", "Cookie"],
      credentials: true,
    })
  );

  // Metrics middleware
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

  // Metrics endpoint
  app.get("/metrics", async (c) => {
    c.header("Content-Type", metricsRegister.contentType);
    return c.body(await metricsRegister.metrics());
  });

  // Auth middleware
  app.use("/api/*", apiKeyAuth);
  app.use("/api/*", sessionMiddleware);
  app.use("/integrations/*", apiKeyAuth);
  app.use("/integrations/*", sessionMiddleware);

  return app;
}
