import { describe, expect, it } from "bun:test";
import {
  getRequestContext,
  runWithRequestContext,
  runWithRequestContextAsync,
  updateRequestContext,
} from "../context";

describe("request context storage", () => {
  it("stores and retrieves context in sync flow", () => {
    const requestId = "req-sync-1";

    runWithRequestContext({ requestId }, () => {
      const current = getRequestContext();
      expect(current?.requestId).toBe(requestId);

      updateRequestContext({ route: "/api/v1/search" });
      expect(getRequestContext()?.route).toBe("/api/v1/search");
    });
  });

  it("stores and retrieves context in async flow", async () => {
    const requestId = "req-async-1";

    await runWithRequestContextAsync({ requestId, method: "GET" }, async () => {
      await Promise.resolve();
      const current = getRequestContext();

      expect(current?.requestId).toBe(requestId);
      expect(current?.method).toBe("GET");
    });
  });
});
