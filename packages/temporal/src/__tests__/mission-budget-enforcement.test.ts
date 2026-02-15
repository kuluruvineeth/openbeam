import { MissionAgentRunInputSchema } from "@openplane/types/temporal/mission";
import { describe, expect, it } from "vitest";

function computePerAgentBudgetCents(
  missionBudgetCents: number | undefined,
  consumedCents: number,
  maxConcurrentRuns: number
): number | undefined {
  if (missionBudgetCents === undefined) {
    return;
  }
  const remainingCents = missionBudgetCents - consumedCents;
  if (remainingCents <= 0) {
    return;
  }
  return Math.max(
    10,
    Math.floor(remainingCents / Math.max(maxConcurrentRuns, 1))
  );
}

describe("per-run budget enforcement", () => {
  describe("MissionAgentRunInputSchema", () => {
    it("parses input with budgetCentsLimit", () => {
      const result = MissionAgentRunInputSchema.parse({
        missionId: "m1",
        teamId: "t1",
        agentId: "a1",
        taskId: "task1",
        runId: "r1",
        soulPrompt: "Do work",
        budgetCentsLimit: 500,
      });
      expect(result.budgetCentsLimit).toBe(500);
    });

    it("parses input without budgetCentsLimit (optional)", () => {
      const result = MissionAgentRunInputSchema.parse({
        missionId: "m1",
        teamId: "t1",
        agentId: "a1",
        taskId: "task1",
        runId: "r1",
        soulPrompt: "Do work",
      });
      expect(result.budgetCentsLimit).toBeUndefined();
    });

    it("rejects budgetCentsLimit below 1", () => {
      expect(() =>
        MissionAgentRunInputSchema.parse({
          missionId: "m1",
          teamId: "t1",
          agentId: "a1",
          taskId: "task1",
          runId: "r1",
          soulPrompt: "Do work",
          budgetCentsLimit: 0,
        })
      ).toThrow();
    });

    it("rejects budgetCentsLimit above 10000", () => {
      expect(() =>
        MissionAgentRunInputSchema.parse({
          missionId: "m1",
          teamId: "t1",
          agentId: "a1",
          taskId: "task1",
          runId: "r1",
          soulPrompt: "Do work",
          budgetCentsLimit: 10_001,
        })
      ).toThrow();
    });
  });

  describe("computePerAgentBudgetCents", () => {
    it("divides remaining budget equally among max concurrent runs", () => {
      expect(computePerAgentBudgetCents(1000, 200, 5)).toBe(160);
    });

    it("returns undefined when budget fully consumed", () => {
      expect(computePerAgentBudgetCents(1000, 1000, 5)).toBeUndefined();
    });

    it("returns undefined when over budget", () => {
      expect(computePerAgentBudgetCents(1000, 1500, 5)).toBeUndefined();
    });

    it("returns undefined when no mission budget", () => {
      expect(computePerAgentBudgetCents(undefined, 0, 5)).toBeUndefined();
    });

    it("enforces minimum 10 cents floor", () => {
      expect(computePerAgentBudgetCents(50, 0, 100)).toBe(10);
    });

    it("handles maxConcurrentRuns of 0 safely", () => {
      expect(computePerAgentBudgetCents(1000, 0, 0)).toBe(1000);
    });

    it("handles single concurrent run", () => {
      expect(computePerAgentBudgetCents(1000, 500, 1)).toBe(500);
    });
  });
});
