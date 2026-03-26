import { rateLimiter } from "@openbeam/redis";
import { createMiddleware } from "hono/factory";
import type { CustomConnectorAuthEnv } from "./custom-connector-auth";

const PUSH_RATE_LIMITS = {
  burstLimit: 20,
  requestsPerMinute: 120,
  requestsPerHour: 5000,
} as const;

export const customConnectorRateLimit =
  createMiddleware<CustomConnectorAuthEnv>(async (c, next) => {
    const ctx = c.get("customConnector");
    const key = `custom-connector:${ctx.connectorId}`;

    const { allowed, reason } = await rateLimiter.checkConnectorRateLimit(
      key,
      "custom",
      {
        burstLimit: PUSH_RATE_LIMITS.burstLimit,
        requestsPerMinute: PUSH_RATE_LIMITS.requestsPerMinute,
        requestsPerHour: PUSH_RATE_LIMITS.requestsPerHour,
      }
    );

    if (!allowed) {
      return c.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: reason ?? "Rate limit exceeded",
          },
        },
        429
      );
    }

    await next();
  });
