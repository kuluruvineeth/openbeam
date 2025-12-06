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
  const corsOrigin =
    process.env.CORS_ORIGIN ||
    process.env.NEXT_PUBLIC_CORS_ORIGIN ||
    "http://localhost:3001";
  const serverUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    "http://localhost:3000";
  const app = new OpenAPIHono<AuthEnv>({
    strict: false,
    defaultHook, // Handles validation errors automatically
  });

  // Middleware
  app.use(logger());
  const allowedOrigins = Array.from(
    new Set(
      [
        corsOrigin,
        serverUrl,
        "http://localhost:3000",
        "http://localhost:3001",
      ].filter((o): o is string => Boolean(o))
    )
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
