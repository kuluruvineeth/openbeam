import { describe, expect, it } from "bun:test";
import { createCostEvent, createMockEvent } from "../../__tests__/test-helpers";
import {
  buildBurnRateTimeline,
  computeBudgetThreshold,
  deriveBurnRate,
  formatBurnRate,
  formatCents,
  projectBudgetExhaustion,
} from "../budget-utils";

describe("deriveBurnRate", () => {
  it("returns 0 for empty events", () => {
    expect(deriveBurnRate([])).toBe(0);
  });

  it("returns 0 for single cost event", () => {
    const events = [createCostEvent("agent-1", 500, 1)];
    expect(deriveBurnRate(events)).toBe(0);
  });

  it("calculates correct rate from multiple cost events", () => {
    const now = Date.now();
    const events = [
      { ...createCostEvent("agent-1", 100, 1), timestamp: now },
      { ...createCostEvent("agent-1", 200, 2), timestamp: now + 60_000 },
      { ...createCostEvent("agent-1", 300, 3), timestamp: now + 120_000 },
    ];
    const rate = deriveBurnRate(events);
    expect(rate).toBe(300);
  });
});

describe("projectBudgetExhaustion", () => {
  it("returns null when burnRate is 0", () => {
    expect(projectBudgetExhaustion(500, 1000, 0)).toBeNull();
  });

  it("returns null when budget already exceeded", () => {
    expect(projectBudgetExhaustion(1200, 1000, 50)).toBeNull();
  });

  it("returns correct timestamp", () => {
    const before = Date.now();
    const result = projectBudgetExhaustion(500, 1000, 100);
    const after = Date.now();

    expect(result).not.toBeNull();
    const expectedMinutes = 500 / 100;
    const expectedMs = expectedMinutes * 60_000;

    if (result === null) {
      throw new Error("Expected non-null result");
    }
    expect(result).toBeGreaterThanOrEqual(before + expectedMs);
    expect(result).toBeLessThanOrEqual(after + expectedMs);
  });
});

describe("buildBurnRateTimeline", () => {
  it("builds cumulative timeline from cost events", () => {
    const now = Date.now();
    const events = [
      { ...createCostEvent("agent-1", 100, 1), timestamp: now },
      { ...createCostEvent("agent-1", 200, 2), timestamp: now + 1000 },
      { ...createCostEvent("agent-1", 150, 3), timestamp: now + 2000 },
    ];

    const timeline = buildBurnRateTimeline(events);

    expect(timeline).toHaveLength(3);
    expect(timeline[0]).toEqual({ timestamp: now, cumulativeCents: 100 });
    expect(timeline[1]).toEqual({
      timestamp: now + 1000,
      cumulativeCents: 300,
    });
    expect(timeline[2]).toEqual({
      timestamp: now + 2000,
      cumulativeCents: 450,
    });
  });

  it("ignores non-cost events", () => {
    const events = [
      createMockEvent({ eventType: "run.started", sequence: 1 }),
      createCostEvent("agent-1", 100, 2),
      createMockEvent({ eventType: "tool.started", sequence: 3 }),
    ];

    const timeline = buildBurnRateTimeline(events);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].cumulativeCents).toBe(100);
  });
});

describe("computeBudgetThreshold", () => {
  it('returns "safe" under 70%', () => {
    expect(computeBudgetThreshold(500, 1000)).toBe("safe");
    expect(computeBudgetThreshold(0, 1000)).toBe("safe");
    expect(computeBudgetThreshold(699, 1000)).toBe("safe");
  });

  it('returns "warning" at 70-90%', () => {
    expect(computeBudgetThreshold(700, 1000)).toBe("warning");
    expect(computeBudgetThreshold(800, 1000)).toBe("warning");
    expect(computeBudgetThreshold(899, 1000)).toBe("warning");
  });

  it('returns "danger" at 90-100%', () => {
    expect(computeBudgetThreshold(900, 1000)).toBe("danger");
    expect(computeBudgetThreshold(950, 1000)).toBe("danger");
    expect(computeBudgetThreshold(1000, 1000)).toBe("danger");
  });

  it('returns "exceeded" over 100%', () => {
    expect(computeBudgetThreshold(1001, 1000)).toBe("exceeded");
    expect(computeBudgetThreshold(2000, 1000)).toBe("exceeded");
  });
});

describe("formatCents", () => {
  it("formats positive values correctly", () => {
    expect(formatCents(14_250)).toBe("$142.50");
    expect(formatCents(100)).toBe("$1.00");
    expect(formatCents(1)).toBe("$0.01");
    expect(formatCents(99)).toBe("$0.99");
  });

  it("formats zero correctly", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats negative values correctly", () => {
    expect(formatCents(-500)).toBe("-$5.00");
  });
});

describe("formatBurnRate", () => {
  it("uses per-minute for low rates", () => {
    expect(formatBurnRate(250)).toBe("$2.50/min");
    expect(formatBurnRate(999)).toBe("$9.99/min");
  });

  it("switches to per-hour for high rates", () => {
    expect(formatBurnRate(1000)).toBe("$600.00/hr");
    expect(formatBurnRate(2000)).toBe("$1200.00/hr");
  });
});
