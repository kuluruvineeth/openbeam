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
  const app = new OpenAPIHono<AuthEnv>({
    strict: false,
    defaultHook, // Handles validation errors automatically
  });

  // Middleware
  app.use(logger());
  app.use(
    "/*",
    cors({
      origin: [
        process.env.CORS_ORIGIN || "",
        "https://new-sculpin-illegally.ngrok-free.app",
        "http://localhost:3001",
      ],
      allowMethods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE", "PUT"],
      allowHeaders: ["Content-Type", "Authorization"],
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

  // Global Auth
  // Note: We might want to make this granular per-route in OpenAPI,
  // but for now keeping backward compatibility.
  // Ideally, we use securitySchemes in OpenAPI.
  app.use("/api/*", apiKeyAuth);
  app.use("/api/*", sessionMiddleware);

  return app;
}
