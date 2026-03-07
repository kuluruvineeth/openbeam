import {
  CheckRateLimitInputSchema,
  CheckRateLimitOutputSchema,
  DEFAULT_CANVAS_EXECUTION_RATE_LIMIT,
  WorkflowRateLimitConfigSchema,
} from "@openbeam/types/temporal";
import { describe, expect, it } from "vitest";

describe("rate limit types", () => {
  describe("CheckRateLimitInputSchema", () => {
    it("validates valid input", () => {
      const input = {
        key: "rate:workflow:canvas-execution:team_123",
        limit: 100,
        windowMs: 3_600_000,
      };

      const result = CheckRateLimitInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects negative limit", () => {
      const input = {
        key: "test-key",
        limit: -1,
        windowMs: 3_600_000,
      };

      const result = CheckRateLimitInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects zero windowMs", () => {
      const input = {
        key: "test-key",
        limit: 100,
        windowMs: 0,
      };

      const result = CheckRateLimitInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("CheckRateLimitOutputSchema", () => {
    it("validates valid output", () => {
      const output = {
        allowed: true,
        remaining: 50,
        resetAt: Date.now() + 3_600_000,
        current: 50,
      };

      const result = CheckRateLimitOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it("rejects negative remaining", () => {
      const output = {
        allowed: false,
        remaining: -1,
        resetAt: Date.now(),
        current: 100,
      };

      const result = CheckRateLimitOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });
  });

  describe("WorkflowRateLimitConfigSchema", () => {
    it("validates valid config", () => {
      const config = {
        limitKey: "canvas-execution",
        limit: 100,
        windowMs: 3_600_000,
      };

      const result = WorkflowRateLimitConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("applies default values", () => {
      const config = {
        limitKey: "canvas-execution",
      };

      const result = WorkflowRateLimitConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
        expect(result.data.windowMs).toBe(60 * 60 * 1000);
      }
    });
  });

  describe("DEFAULT_CANVAS_EXECUTION_RATE_LIMIT", () => {
    it("has expected default values", () => {
      expect(DEFAULT_CANVAS_EXECUTION_RATE_LIMIT.limitKey).toBe(
        "canvas-execution"
      );
      expect(DEFAULT_CANVAS_EXECUTION_RATE_LIMIT.limit).toBe(100);
      expect(DEFAULT_CANVAS_EXECUTION_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000);
    });
  });
});
