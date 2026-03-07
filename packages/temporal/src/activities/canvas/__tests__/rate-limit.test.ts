import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckRateLimitActivity } from "../rate-limit";

const { mockCheckLimit, mockGetUsage } = vi.hoisted(() => ({
  mockCheckLimit: vi.fn(() => Promise.resolve(true)),
  mockGetUsage: vi.fn(() => Promise.resolve(50)),
}));

vi.mock("@openbeam/redis", () => ({
  rateLimiter: {
    checkLimit: mockCheckLimit,
    getUsage: mockGetUsage,
  },
}));

describe("checkRateLimitActivity", () => {
  const checkRateLimit = createCheckRateLimitActivity();

  beforeEach(() => {
    mockCheckLimit.mockClear();
    mockGetUsage.mockClear();
  });

  it("returns allowed=true when under limit", async () => {
    mockCheckLimit.mockResolvedValue(true);
    mockGetUsage.mockResolvedValue(50);

    const result = await checkRateLimit({
      key: "rate:workflow:canvas-execution:team_123",
      limit: 100,
      windowMs: 3_600_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(50);
    expect(result.current).toBe(50);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("returns allowed=false when over limit", async () => {
    mockCheckLimit.mockResolvedValue(false);
    mockGetUsage.mockResolvedValue(100);

    const result = await checkRateLimit({
      key: "rate:workflow:canvas-execution:team_123",
      limit: 100,
      windowMs: 3_600_000,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.current).toBe(100);
  });

  it("calculates remaining correctly when near limit", async () => {
    mockCheckLimit.mockResolvedValue(true);
    mockGetUsage.mockResolvedValue(95);

    const result = await checkRateLimit({
      key: "rate:workflow:canvas-execution:team_123",
      limit: 100,
      windowMs: 3_600_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("passes correct window in seconds to rate limiter", async () => {
    mockCheckLimit.mockResolvedValue(true);
    mockGetUsage.mockResolvedValue(0);

    await checkRateLimit({
      key: "test-key",
      limit: 50,
      windowMs: 60_000,
    });

    expect(mockCheckLimit).toHaveBeenCalledWith("test-key", 50, 60);
    expect(mockGetUsage).toHaveBeenCalledWith("test-key", 60);
  });

  it("handles edge case where current exceeds limit", async () => {
    mockCheckLimit.mockResolvedValue(false);
    mockGetUsage.mockResolvedValue(150);

    const result = await checkRateLimit({
      key: "test-key",
      limit: 100,
      windowMs: 3_600_000,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.current).toBe(150);
  });
});
