import { describe, expect, it } from "bun:test";
import type { Database } from "@openbeam/db";
import {
  checkAgentQuota,
  checkRunQuota,
  estimateRunCost,
} from "../src/billing";

interface MockCounts {
  agents: number;
  monthlyRuns: number;
  activeRuns: number;
}

function mockDb(counts: MockCounts): Database {
  let callIndex = 0;
  const runCounts = [counts.monthlyRuns, counts.activeRuns];

  return {
    computerAgent: {
      count: () => Promise.resolve(counts.agents),
    },
    computerRun: {
      count: () => {
        const value = runCounts[callIndex] ?? 0;
        callIndex += 1;
        return Promise.resolve(value);
      },
    },
  } as unknown as Database;
}

describe("checkAgentQuota", () => {
  it("allows agent creation under free plan limit", async () => {
    const result = await checkAgentQuota(
      mockDb({ agents: 1, monthlyRuns: 0, activeRuns: 0 }),
      "team_1",
      "free"
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("blocks agent creation at free plan ceiling (2)", async () => {
    const result = await checkAgentQuota(
      mockDb({ agents: 2, monthlyRuns: 0, activeRuns: 0 }),
      "team_1",
      "free"
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("2");
  });

  it("starter plan allows up to 5 agents", async () => {
    const under = await checkAgentQuota(
      mockDb({ agents: 4, monthlyRuns: 0, activeRuns: 0 }),
      "team_1",
      "starter"
    );
    const at = await checkAgentQuota(
      mockDb({ agents: 5, monthlyRuns: 0, activeRuns: 0 }),
      "team_1",
      "starter"
    );
    expect(under.allowed).toBe(true);
    expect(at.allowed).toBe(false);
  });

  it("pro plan allows up to 25 agents", async () => {
    const under = await checkAgentQuota(
      mockDb({ agents: 24, monthlyRuns: 0, activeRuns: 0 }),
      "team_1",
      "pro"
    );
    const at = await checkAgentQuota(
      mockDb({ agents: 25, monthlyRuns: 0, activeRuns: 0 }),
      "team_1",
      "pro"
    );
    expect(under.allowed).toBe(true);
    expect(at.allowed).toBe(false);
  });

  it("enterprise plan allows up to 100 agents", async () => {
    const result = await checkAgentQuota(
      mockDb({ agents: 99, monthlyRuns: 0, activeRuns: 0 }),
      "team_1",
      "enterprise"
    );
    expect(result.allowed).toBe(true);
  });

  it("unknown plan tier defaults to free limits", async () => {
    const result = await checkAgentQuota(
      mockDb({ agents: 2, monthlyRuns: 0, activeRuns: 0 }),
      "team_1",
      "custom-plan"
    );
    expect(result.allowed).toBe(false);
  });
});

describe("checkRunQuota", () => {
  it("allows run under monthly and concurrent limits", async () => {
    const result = await checkRunQuota(
      mockDb({ agents: 0, monthlyRuns: 10, activeRuns: 0 }),
      "team_1",
      "free"
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks run at monthly limit before checking concurrent", async () => {
    const result = await checkRunQuota(
      mockDb({ agents: 0, monthlyRuns: 50, activeRuns: 0 }),
      "team_1",
      "free"
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Monthly run limit");
    expect(result.reason).toContain("50");
  });

  it("blocks run at concurrent limit when monthly is under", async () => {
    const result = await checkRunQuota(
      mockDb({ agents: 0, monthlyRuns: 5, activeRuns: 1 }),
      "team_1",
      "free"
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Concurrent run limit");
    expect(result.reason).toContain("1");
  });

  it("starter plan allows 3 concurrent runs", async () => {
    const underLimit = await checkRunQuota(
      mockDb({ agents: 0, monthlyRuns: 10, activeRuns: 2 }),
      "team_1",
      "starter"
    );
    const atLimit = await checkRunQuota(
      mockDb({ agents: 0, monthlyRuns: 10, activeRuns: 3 }),
      "team_1",
      "starter"
    );
    expect(underLimit.allowed).toBe(true);
    expect(atLimit.allowed).toBe(false);
  });
});

describe("estimateRunCost", () => {
  it("calculates cost for claude-haiku-4-5 at $0.80/M input, $4/M output", () => {
    const cost = estimateRunCost("claude-haiku-4-5", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(4.8, 2);
  });

  it("calculates cost for claude-sonnet-4-6 at $3/M input, $15/M output", () => {
    const cost = estimateRunCost("claude-sonnet-4-6", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18.0, 2);
  });

  it("calculates cost for claude-opus-4-6 at $15/M input, $75/M output", () => {
    const cost = estimateRunCost("claude-opus-4-6", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(90.0, 2);
  });

  it("falls back to haiku rates for unknown models", () => {
    const unknown = estimateRunCost("gpt-4.5", 1_000_000, 1_000_000);
    const haiku = estimateRunCost("claude-haiku-4-5", 1_000_000, 1_000_000);
    expect(unknown).toBeCloseTo(haiku, 4);
  });

  it("returns zero for zero tokens", () => {
    expect(estimateRunCost("claude-haiku-4-5", 0, 0)).toBe(0);
  });

  it("scales linearly with token count", () => {
    const oneMillion = estimateRunCost("claude-haiku-4-5", 1_000_000, 0);
    const twoMillion = estimateRunCost("claude-haiku-4-5", 2_000_000, 0);
    expect(twoMillion).toBeCloseTo(oneMillion * 2, 4);
  });
});
