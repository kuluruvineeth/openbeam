import { describe, expect, it } from "bun:test";
import { InMemoryRateLimiter } from "../rate-limit";

describe("in-memory sandbox rate limiter", () => {
  it("permits requests until the configured limit", () => {
    const limiter = new InMemoryRateLimiter();
    const now = 1000;
    const policy = {
      keySuffix: "exec",
      limit: 2,
      windowMs: 60_000,
    };

    const first = limiter.take("team-1:exec", policy, now);
    const second = limiter.take("team-1:exec", policy, now + 1);
    const third = limiter.take("team-1:exec", policy, now + 2);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("resets limits after the window expires", () => {
    const limiter = new InMemoryRateLimiter();
    const policy = {
      keySuffix: "default",
      limit: 1,
      windowMs: 1000,
    };

    const first = limiter.take("team-1:default", policy, 10_000);
    const blocked = limiter.take("team-1:default", policy, 10_100);
    const reset = limiter.take("team-1:default", policy, 11_001);

    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(reset.allowed).toBe(true);
  });
});
