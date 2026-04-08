import { describe, expect, it } from "bun:test";
import {
  checkTeamRateLimit,
  checkUserRateLimit,
} from "../../src/lib/rate-limit";

describe("checkUserRateLimit", () => {
  it("allows first request", () => {
    expect(checkUserRateLimit("SLACK", "unique-user-1")).toBe(true);
  });

  it("allows up to 30 requests per minute", () => {
    const userId = "burst-test-user";
    for (let i = 0; i < 30; i += 1) {
      expect(checkUserRateLimit("SLACK", userId)).toBe(true);
    }
  });

  it("blocks after 30 requests", () => {
    const userId = "blocked-user";
    for (let i = 0; i < 30; i += 1) {
      checkUserRateLimit("TELEGRAM", userId);
    }
    expect(checkUserRateLimit("TELEGRAM", userId)).toBe(false);
  });

  it("tracks per platform independently", () => {
    const userId = "cross-platform";
    for (let i = 0; i < 30; i += 1) {
      checkUserRateLimit("DISCORD", userId);
    }
    expect(checkUserRateLimit("TEAMS", userId)).toBe(true);
  });
});

describe("checkTeamRateLimit", () => {
  it("allows first request", () => {
    expect(checkTeamRateLimit("unique-team-1")).toBe(true);
  });

  it("allows up to 500 requests per minute", () => {
    const teamId = "busy-team";
    for (let i = 0; i < 500; i += 1) {
      expect(checkTeamRateLimit(teamId)).toBe(true);
    }
  });

  it("blocks after 500 requests", () => {
    const teamId = "overloaded-team";
    for (let i = 0; i < 500; i += 1) {
      checkTeamRateLimit(teamId);
    }
    expect(checkTeamRateLimit(teamId)).toBe(false);
  });
});
