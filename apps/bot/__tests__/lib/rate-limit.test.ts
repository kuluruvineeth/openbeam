import { beforeEach, describe, expect, it } from "bun:test";
import {
  checkTeamRateLimit,
  checkUserRateLimit,
  resetBuckets,
} from "../../src/lib/rate-limit";

describe("checkUserRateLimit", () => {
  beforeEach(resetBuckets);

  it("allows first request", () => {
    const result = checkUserRateLimit("SLACK", "u1");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("allows up to 30 requests per minute", () => {
    for (let i = 0; i < 30; i += 1) {
      expect(checkUserRateLimit("SLACK", "burst-u").allowed).toBe(true);
    }
  });

  it("blocks after 30 requests with retry timing", () => {
    for (let i = 0; i < 30; i += 1) {
      checkUserRateLimit("TELEGRAM", "blocked-u");
    }
    const result = checkUserRateLimit("TELEGRAM", "blocked-u");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("tracks per platform independently", () => {
    for (let i = 0; i < 30; i += 1) {
      checkUserRateLimit("DISCORD", "cross-u");
    }
    expect(checkUserRateLimit("TEAMS", "cross-u").allowed).toBe(true);
  });
});

describe("checkTeamRateLimit", () => {
  beforeEach(resetBuckets);

  it("allows first request", () => {
    const result = checkTeamRateLimit("t1");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("allows up to 500 requests per minute", () => {
    for (let i = 0; i < 500; i += 1) {
      expect(checkTeamRateLimit("busy-t").allowed).toBe(true);
    }
  });

  it("blocks after 500 requests with retry timing", () => {
    for (let i = 0; i < 500; i += 1) {
      checkTeamRateLimit("over-t");
    }
    const result = checkTeamRateLimit("over-t");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});
