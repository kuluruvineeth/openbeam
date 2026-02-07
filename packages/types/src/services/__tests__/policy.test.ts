import { describe, expect, it } from "bun:test";
import {
  ExecutionPolicySchema,
  PolicyCheckResultSchema,
  PolicyViolationSchema,
  PolicyWarningSchema,
} from "../policy";

describe("ExecutionPolicySchema", () => {
  it("parses a full policy object", () => {
    const policy = ExecutionPolicySchema.parse({
      maxTokenBudget: 5000,
      maxDurationMs: 60_000,
      maxToolCalls: 50,
      maxConcurrentExecutions: 10,
      allowedToolCategories: ["search", "rag"],
      blockedToolCategories: ["browser"],
      requireApprovalForCategories: ["action"],
      maxStakesLevel: "medium",
    });

    expect(policy.maxTokenBudget).toBe(5000);
    expect(policy.maxDurationMs).toBe(60_000);
    expect(policy.maxToolCalls).toBe(50);
    expect(policy.maxConcurrentExecutions).toBe(10);
    expect(policy.allowedToolCategories).toEqual(["search", "rag"]);
    expect(policy.blockedToolCategories).toEqual(["browser"]);
    expect(policy.requireApprovalForCategories).toEqual(["action"]);
    expect(policy.maxStakesLevel).toBe("medium");
  });

  it("applies defaults for all optional fields", () => {
    const policy = ExecutionPolicySchema.parse({});

    expect(policy.maxTokenBudget).toBe(0);
    expect(policy.maxDurationMs).toBe(0);
    expect(policy.maxToolCalls).toBe(0);
    expect(policy.maxConcurrentExecutions).toBe(10);
    expect(policy.allowedToolCategories).toEqual([]);
    expect(policy.blockedToolCategories).toEqual([]);
    expect(policy.requireApprovalForCategories).toEqual([]);
    expect(policy.maxStakesLevel).toBe("high");
  });

  it("rejects negative values for numeric fields", () => {
    expect(() => ExecutionPolicySchema.parse({ maxTokenBudget: -1 })).toThrow();

    expect(() =>
      ExecutionPolicySchema.parse({ maxDurationMs: -100 })
    ).toThrow();
  });

  it("rejects maxConcurrentExecutions below 1", () => {
    expect(() =>
      ExecutionPolicySchema.parse({ maxConcurrentExecutions: 0 })
    ).toThrow();
  });

  it("rejects invalid tool categories", () => {
    expect(() =>
      ExecutionPolicySchema.parse({
        allowedToolCategories: ["nonexistent"],
      })
    ).toThrow();
  });

  it("rejects invalid stakes levels", () => {
    expect(() =>
      ExecutionPolicySchema.parse({ maxStakesLevel: "extreme" })
    ).toThrow();
  });
});

describe("PolicyViolationSchema", () => {
  it("parses a violation", () => {
    const violation = PolicyViolationSchema.parse({
      rule: "maxTokenBudget",
      current: 6000,
      limit: 5000,
      message: "Token budget exceeded",
    });

    expect(violation.rule).toBe("maxTokenBudget");
    expect(violation.current).toBe(6000);
    expect(violation.limit).toBe(5000);
  });
});

describe("PolicyWarningSchema", () => {
  it("parses a warning", () => {
    const warning = PolicyWarningSchema.parse({
      rule: "maxTokenBudget",
      current: 4000,
      threshold: 4500,
      message: "Approaching token budget",
    });

    expect(warning.rule).toBe("maxTokenBudget");
    expect(warning.current).toBe(4000);
    expect(warning.threshold).toBe(4500);
  });
});

describe("PolicyCheckResultSchema", () => {
  it("parses an allowed result", () => {
    const result = PolicyCheckResultSchema.parse({
      allowed: true,
      violations: [],
      warnings: [],
    });

    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("parses a denied result with violations", () => {
    const result = PolicyCheckResultSchema.parse({
      allowed: false,
      violations: [
        {
          rule: "maxToolCalls",
          current: 60,
          limit: 50,
          message: "Tool call limit exceeded",
        },
      ],
      warnings: [
        {
          rule: "maxTokenBudget",
          current: 4500,
          threshold: 4000,
          message: "Approaching token limit",
        },
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
});
