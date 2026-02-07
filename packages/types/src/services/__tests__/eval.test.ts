import { describe, expect, it } from "bun:test";
import {
  EVAL_DIMENSION_WEIGHTS,
  EvalDimensionScoresSchema,
  EvalFlagSchema,
  ExecutionEvalResultSchema,
} from "../eval";

describe("eval types", () => {
  describe("EVAL_DIMENSION_WEIGHTS", () => {
    it("sums to 1.0", () => {
      const sum = Object.values(EVAL_DIMENSION_WEIGHTS).reduce(
        (acc, w) => acc + w,
        0
      );
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
    });

    it("has all five dimensions", () => {
      expect(Object.keys(EVAL_DIMENSION_WEIGHTS)).toEqual([
        "completion",
        "efficiency",
        "errorRate",
        "latency",
        "approvalOverhead",
      ]);
    });
  });

  describe("EvalDimensionScoresSchema", () => {
    it("validates valid scores", () => {
      const result = EvalDimensionScoresSchema.safeParse({
        completion: 100,
        efficiency: 75,
        errorRate: 90,
        latency: 50,
        approvalOverhead: 100,
      });
      expect(result.success).toBe(true);
    });

    it("rejects scores below 0", () => {
      const result = EvalDimensionScoresSchema.safeParse({
        completion: -1,
        efficiency: 75,
        errorRate: 90,
        latency: 50,
        approvalOverhead: 100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects scores above 100", () => {
      const result = EvalDimensionScoresSchema.safeParse({
        completion: 101,
        efficiency: 75,
        errorRate: 90,
        latency: 50,
        approvalOverhead: 100,
      });
      expect(result.success).toBe(false);
    });

    it("requires all five dimensions", () => {
      const result = EvalDimensionScoresSchema.safeParse({
        completion: 100,
        efficiency: 75,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("EvalFlagSchema", () => {
    it("accepts valid flags", () => {
      const flags = [
        "budget_exceeded",
        "approval_timeout",
        "loop_max_hit",
        "high_error_rate",
        "slow_execution",
        "no_steps",
      ];
      for (const flag of flags) {
        expect(EvalFlagSchema.safeParse(flag).success).toBe(true);
      }
    });

    it("rejects invalid flags", () => {
      expect(EvalFlagSchema.safeParse("unknown_flag").success).toBe(false);
    });
  });

  describe("ExecutionEvalResultSchema", () => {
    it("validates a complete eval result", () => {
      const result = ExecutionEvalResultSchema.safeParse({
        score: 85,
        dimensions: {
          completion: 100,
          efficiency: 80,
          errorRate: 90,
          latency: 70,
          approvalOverhead: 100,
        },
        flags: [],
        evaluatedAt: Date.now(),
      });
      expect(result.success).toBe(true);
    });

    it("validates eval result with flags", () => {
      const result = ExecutionEvalResultSchema.safeParse({
        score: 30,
        dimensions: {
          completion: 0,
          efficiency: 50,
          errorRate: 40,
          latency: 20,
          approvalOverhead: 100,
        },
        flags: ["high_error_rate", "slow_execution"],
        evaluatedAt: Date.now(),
      });
      expect(result.success).toBe(true);
    });

    it("rejects score below 0", () => {
      const result = ExecutionEvalResultSchema.safeParse({
        score: -1,
        dimensions: {
          completion: 100,
          efficiency: 100,
          errorRate: 100,
          latency: 100,
          approvalOverhead: 100,
        },
        flags: [],
        evaluatedAt: Date.now(),
      });
      expect(result.success).toBe(false);
    });

    it("rejects score above 100", () => {
      const result = ExecutionEvalResultSchema.safeParse({
        score: 101,
        dimensions: {
          completion: 100,
          efficiency: 100,
          errorRate: 100,
          latency: 100,
          approvalOverhead: 100,
        },
        flags: [],
        evaluatedAt: Date.now(),
      });
      expect(result.success).toBe(false);
    });

    it("requires integer score", () => {
      const result = ExecutionEvalResultSchema.safeParse({
        score: 85.5,
        dimensions: {
          completion: 100,
          efficiency: 80,
          errorRate: 90,
          latency: 70,
          approvalOverhead: 100,
        },
        flags: [],
        evaluatedAt: Date.now(),
      });
      expect(result.success).toBe(false);
    });
  });
});
