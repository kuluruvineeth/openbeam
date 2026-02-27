import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { getRequestContext } from "../context";
import { createRequestContextMiddleware } from "../hono";

describe("request context middleware", () => {
  it("propagates incoming request id and context", async () => {
    const app = new Hono();

    app.use("*", createRequestContextMiddleware());
    app.get("/hello", (c) =>
      c.json({ requestId: getRequestContext()?.requestId ?? null })
    );

    const response = await app.request("/hello", {
      headers: {
        "x-request-id": "req-header-123",
      },
    });

    const body = (await response.json()) as { requestId: string | null };

    expect(response.headers.get("x-request-id")).toBe("req-header-123");
    expect(body.requestId).toBe("req-header-123");
  });

  it("generates request id when header is missing", async () => {
    const app = new Hono();

    app.use("*", createRequestContextMiddleware());
    app.get("/hello", (c) =>
      c.json({ requestId: getRequestContext()?.requestId ?? null })
    );

    const response = await app.request("/hello");
    const body = (await response.json()) as { requestId: string | null };
    const requestId = response.headers.get("x-request-id");

    expect(requestId).toBeTruthy();
    expect(body.requestId).toBe(requestId);
  });

  it("skips middleware paths when configured", async () => {
    const app = new Hono();

    app.use("*", createRequestContextMiddleware({ skipPaths: ["/metrics"] }));
    app.get("/metrics", (c) =>
      c.json({ requestId: getRequestContext()?.requestId ?? null })
    );

    const response = await app.request("/metrics", {
      headers: {
        "x-request-id": "skip-me",
      },
    });

    const body = (await response.json()) as { requestId: string | null };

    expect(response.headers.get("x-request-id")).toBeNull();
    expect(body.requestId).toBeNull();
  });
});
