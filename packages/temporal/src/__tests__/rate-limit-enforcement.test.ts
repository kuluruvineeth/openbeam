import { beforeEach, describe, expect, it, vi } from "vitest";

const RATE_LIMIT_EXCEEDED_RE = /Rate limit exceeded/;
const TEAM_XYZ_RE = /team_xyz/;
const LIMIT_200_RE = /200 executions per hour/;
const LIMIT_100_RE = /100 executions per hour/;
const RESETS_AT_RE = /Resets at/;

const { mockCheckRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@temporalio/workflow", () => ({
  proxyActivities: () => ({
    checkRateLimit: mockCheckRateLimit,
  }),
  ApplicationFailure: {
    nonRetryable: (message: string, type: string, details?: unknown) => {
      const err = new Error(message);
      err.name = type;
      (err as unknown as Record<string, unknown>).details = details;
      return err;
    },
  },
}));

import {
  checkWorkflowRateLimit,
  enforceWorkflowRateLimit,
} from "../workflows/canvas/utils/rate-limit";

describe("checkWorkflowRateLimit", () => {
  beforeEach(() => {
    mockCheckRateLimit.mockReset();
  });

  it("builds correct Redis key with teamId", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: Date.now() + 3_600_000,
      current: 1,
    });

    await checkWorkflowRateLimit({ teamId: "team_abc" });

    expect(mockCheckRateLimit).toHaveBeenCalledWith({
      key: "rate:workflow:canvas-execution:team_abc",
      limit: 100,
      windowMs: 3_600_000,
    });
  });

  it("uses custom limitKey when provided", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 50,
      resetAt: Date.now() + 3_600_000,
      current: 50,
    });

    await checkWorkflowRateLimit({
      teamId: "team_1",
      limitKey: "agent-execution",
    });

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "rate:workflow:agent-execution:team_1",
      })
    );
  });

  it("uses custom limit and windowMs", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 45,
      resetAt: Date.now() + 60_000,
      current: 5,
    });

    await checkWorkflowRateLimit({
      teamId: "team_1",
      limit: 50,
      windowMs: 60_000,
    });

    expect(mockCheckRateLimit).toHaveBeenCalledWith({
      key: "rate:workflow:canvas-execution:team_1",
      limit: 50,
      windowMs: 60_000,
    });
  });

  it("returns activity result directly", async () => {
    const expected = {
      allowed: false,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      current: 100,
    };
    mockCheckRateLimit.mockResolvedValue(expected);

    const result = await checkWorkflowRateLimit({ teamId: "team_1" });
    expect(result).toEqual(expected);
  });
});

describe("enforceWorkflowRateLimit", () => {
  beforeEach(() => {
    mockCheckRateLimit.mockReset();
  });

  it("returns result when allowed", async () => {
    const rateResult = {
      allowed: true,
      remaining: 50,
      resetAt: Date.now() + 3_600_000,
      current: 50,
    };
    mockCheckRateLimit.mockResolvedValue(rateResult);

    const result = await enforceWorkflowRateLimit({ teamId: "team_1" });
    expect(result).toEqual(rateResult);
  });

  it("throws non-retryable error when limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      current: 100,
    });

    await expect(
      enforceWorkflowRateLimit({ teamId: "team_1" })
    ).rejects.toThrow(RATE_LIMIT_EXCEEDED_RE);
  });

  it("includes teamId in error message", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      current: 100,
    });

    await expect(
      enforceWorkflowRateLimit({ teamId: "team_xyz" })
    ).rejects.toThrow(TEAM_XYZ_RE);
  });

  it("error is typed as RATE_LIMITED", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      current: 100,
    });

    try {
      await enforceWorkflowRateLimit({ teamId: "team_1" });
      expect.fail("should have thrown");
    } catch (error) {
      expect((error as Error).name).toBe("RATE_LIMITED");
    }
  });

  it("includes limit value in error message", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      current: 200,
    });

    await expect(
      enforceWorkflowRateLimit({ teamId: "team_1", limit: 200 })
    ).rejects.toThrow(LIMIT_200_RE);
  });

  it("uses default limit of 100 in error message", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      current: 100,
    });

    await expect(
      enforceWorkflowRateLimit({ teamId: "team_1" })
    ).rejects.toThrow(LIMIT_100_RE);
  });

  it("includes reset timestamp in error message", async () => {
    const resetAt = 1_700_000_000_000;
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt,
      current: 100,
    });

    await expect(
      enforceWorkflowRateLimit({ teamId: "team_1" })
    ).rejects.toThrow(RESETS_AT_RE);
  });

  it("isolates rate limits per team", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: Date.now() + 3_600_000,
      current: 1,
    });

    await enforceWorkflowRateLimit({ teamId: "team_a" });
    await enforceWorkflowRateLimit({ teamId: "team_b" });

    const calls = mockCheckRateLimit.mock.calls;
    expect(calls[0]?.[0].key).toBe("rate:workflow:canvas-execution:team_a");
    expect(calls[1]?.[0].key).toBe("rate:workflow:canvas-execution:team_b");
  });
});
