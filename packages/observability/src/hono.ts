import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { runWithRequestContextAsync } from "./context";

const DEFAULT_REQUEST_ID_HEADER = "x-request-id";

export interface RequestContextMiddlewareOptions {
  requestIdHeader?: string;
  skipPaths?: string[];
}

export function createRequestContextMiddleware(
  options: RequestContextMiddlewareOptions = {}
): MiddlewareHandler {
  const requestIdHeader = options.requestIdHeader ?? DEFAULT_REQUEST_ID_HEADER;
  const skipPaths = new Set(options.skipPaths ?? []);

  return async (c, next) => {
    if (skipPaths.has(c.req.path)) {
      await next();
      return;
    }

    const requestId = c.req.header(requestIdHeader) ?? randomUUID();

    c.header(requestIdHeader, requestId);

    await runWithRequestContextAsync(
      {
        requestId,
        method: c.req.method,
        path: c.req.path,
      },
      async () => {
        await next();
      }
    );
  };
}
