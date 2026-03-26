import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { extractEventId, getDedupTtl } from "../dedup";

describe("extractEventId", () => {
  const rawBody = '{"event":"test"}';
  const payload = { event: "test", delivery_id: "del-123" };

  it("extracts ID from header", () => {
    const headers = { "x-delivery-id": "header-abc" };
    const config = { idHeader: "X-Delivery-Id", ttlSeconds: 86_400 };

    expect(extractEventId(rawBody, headers, payload, config)).toBe(
      "header-abc"
    );
  });

  it("extracts ID from payload via JSONPath", () => {
    const headers: Record<string, string> = {};
    const config = { idPath: "delivery_id", ttlSeconds: 86_400 };

    expect(extractEventId(rawBody, headers, payload, config)).toBe("del-123");
  });

  it("falls back to body hash", () => {
    const headers: Record<string, string> = {};
    const result = extractEventId(rawBody, headers, payload, undefined);
    const expected = createHash("sha256")
      .update(rawBody)
      .digest("hex")
      .slice(0, 32);

    expect(result).toBe(expected);
  });

  it("prefers header over payload path", () => {
    const headers = { "x-id": "from-header" };
    const config = {
      idHeader: "X-Id",
      idPath: "delivery_id",
      ttlSeconds: 86_400,
    };

    expect(extractEventId(rawBody, headers, payload, config)).toBe(
      "from-header"
    );
  });
});

describe("getDedupTtl", () => {
  it("returns configured TTL", () => {
    expect(getDedupTtl({ ttlSeconds: 3600 })).toBe(3600);
  });

  it("returns default TTL when no config", () => {
    expect(getDedupTtl(undefined)).toBe(86_400);
  });
});
