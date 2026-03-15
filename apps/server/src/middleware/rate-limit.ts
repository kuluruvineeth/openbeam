import { rateLimiter } from "@openbeam/redis";
import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "./auth";

const PUBLIC_BURST_LIMIT = 30;
const PUBLIC_BURST_WINDOW = 10;
const PUBLIC_MINUTE_LIMIT = 200;
const PUBLIC_MINUTE_WINDOW = 60;

function extractClientIp(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-real-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function ipRateLimit(config?: {
  burstLimit?: number;
  burstWindow?: number;
  minuteLimit?: number;
  minuteWindow?: number;
}) {
  const burstLimit = config?.burstLimit ?? PUBLIC_BURST_LIMIT;
  const burstWindow = config?.burstWindow ?? PUBLIC_BURST_WINDOW;
  const minuteLimit = config?.minuteLimit ?? PUBLIC_MINUTE_LIMIT;
  const minuteWindow = config?.minuteWindow ?? PUBLIC_MINUTE_WINDOW;

  return createMiddleware<AuthEnv>(async (c, next) => {
    const ip = extractClientIp(c);
    const burstKey = `public:${ip}:burst`;
    const minuteKey = `public:${ip}:minute`;

    const [burstAllowed, minuteAllowed] = await Promise.all([
      rateLimiter.checkLimit(burstKey, burstLimit, burstWindow),
      rateLimiter.checkLimit(minuteKey, minuteLimit, minuteWindow),
    ]);

    if (!(burstAllowed && minuteAllowed)) {
      c.header(
        "Retry-After",
        String(burstAllowed ? minuteWindow : burstWindow)
      );
      return c.json(
        {
          error: "Too many requests",
          retryAfter: burstAllowed ? minuteWindow : burstWindow,
        },
        429
      );
    }

    await next();
  });
}
