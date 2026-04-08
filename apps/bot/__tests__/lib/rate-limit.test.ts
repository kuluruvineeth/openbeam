import { beforeEach, describe, expect, it } from "bun:test";
import {
  checkTeamRateLimit,
  checkUserRateLimit,
  resetBuckets,
} from "../../src/lib/rate-limit";

describe("checkUserRateLimit", () => {
  beforeEach(resetBuckets);

  it("allows first request", () => {
    expect(checkUserRateLimit("SLACK", "u1")).toBe(true);
  });

  it("allows up to 30 requests per minute", () => {
    for (let i = 0; i < 30; i += 1) {
      expect(checkUserRateLimit("SLACK", "burst-u")).toBe(true);
    }
  });

  it("blocks after 30 requests", () => {
    for (let i = 0; i < 30; i += 1) {
      checkUserRateLimit("TELEGRAM", "blocked-u");
    }
    expect(checkUserRateLimit("TELEGRAM", "blocked-u")).toBe(false);
  });

  it("tracks per platform independently", () => {
    for (let i = 0; i < 30; i += 1) {
      checkUserRateLimit("DISCORD", "cross-u");
    }
    expect(checkUserRateLimit("TEAMS", "cross-u")).toBe(true);
  });
});

describe("checkTeamRateLimit", () => {
  beforeEach(resetBuckets);

  it("allows first request", () => {
    expect(checkTeamRateLimit("t1")).toBe(true);
  });

  it("allows up to 500 requests per minute", () => {
    for (let i = 0; i < 500; i += 1) {
      expect(checkTeamRateLimit("busy-t")).toBe(true);
    }
  });

  it("blocks after 500 requests", () => {
    for (let i = 0; i < 500; i += 1) {
      checkTeamRateLimit("over-t");
    }
    expect(checkTeamRateLimit("over-t")).toBe(false);
  });
});
