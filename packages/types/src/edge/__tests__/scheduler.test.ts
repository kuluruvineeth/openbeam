import { describe, expect, it } from "bun:test";
import {
  calculateBackoffMs,
  PRIORITY_WEIGHTS,
  type RetryPolicy,
  RetryPolicySchema,
  type TaskDefinition,
  TaskDefinitionSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
} from "../scheduler";

describe("TaskStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of [
      "pending",
      "running",
      "completed",
      "failed",
      "dead_letter",
    ]) {
      expect(TaskStatusSchema.parse(s)).toBe(s);
    }
  });
});

describe("TaskPrioritySchema", () => {
  it("accepts valid priorities", () => {
    for (const p of ["critical", "high", "normal", "low"]) {
      expect(TaskPrioritySchema.parse(p)).toBe(p);
    }
  });
});

describe("PRIORITY_WEIGHTS", () => {
  it("has ascending weights (lower = higher priority)", () => {
    expect(PRIORITY_WEIGHTS.critical).toBeLessThan(PRIORITY_WEIGHTS.high);
    expect(PRIORITY_WEIGHTS.high).toBeLessThan(PRIORITY_WEIGHTS.normal);
    expect(PRIORITY_WEIGHTS.normal).toBeLessThan(PRIORITY_WEIGHTS.low);
  });
});

describe("RetryPolicySchema", () => {
  it("uses defaults", () => {
    const policy: RetryPolicy = RetryPolicySchema.parse({});
    expect(policy.maxAttempts).toBe(3);
    expect(policy.baseDelayMs).toBe(1000);
    expect(policy.maxDelayMs).toBe(60_000);
    expect(policy.backoffMultiplier).toBe(2);
    expect(policy.jitterFactor).toBe(0.1);
  });

  it("validates jitter range", () => {
    expect(() => RetryPolicySchema.parse({ jitterFactor: 1.5 })).toThrow();
    expect(() => RetryPolicySchema.parse({ jitterFactor: -0.1 })).toThrow();
  });
});

describe("TaskDefinitionSchema", () => {
  it("parses minimal task", () => {
    const now = Date.now();
    const task: TaskDefinition = TaskDefinitionSchema.parse({
      id: "task-1",
      name: "sync-data",
      createdAt: now,
      updatedAt: now,
    });
    expect(task.status).toBe("pending");
    expect(task.priority).toBe("normal");
    expect(task.attempts).toBe(0);
    expect(task.maxAttempts).toBe(3);
    expect(task.payload).toEqual({});
  });

  it("parses full task", () => {
    const now = Date.now();
    const task = TaskDefinitionSchema.parse({
      id: "task-2",
      name: "index-documents",
      payload: { connectorId: "conn-1", batchSize: 50 },
      status: "running",
      priority: "high",
      retryPolicy: { maxAttempts: 5, baseDelayMs: 500 },
      attempts: 1,
      maxAttempts: 5,
      scheduledAt: now + 30_000,
      startedAt: now,
      cronExpression: "*/5 * * * *",
      createdAt: now - 60_000,
      updatedAt: now,
    });
    expect(task.priority).toBe("high");
    expect(task.retryPolicy.maxAttempts).toBe(5);
    expect(task.cronExpression).toBe("*/5 * * * *");
  });

  it("rejects empty name", () => {
    expect(() =>
      TaskDefinitionSchema.parse({
        id: "task-3",
        name: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).toThrow();
  });
});

describe("calculateBackoffMs", () => {
  const basePolicy: RetryPolicy = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 60_000,
    backoffMultiplier: 2,
    jitterFactor: 0,
  };

  it("returns base delay for first attempt without jitter", () => {
    expect(calculateBackoffMs(0, basePolicy)).toBe(1000);
  });

  it("doubles delay on second attempt", () => {
    expect(calculateBackoffMs(1, basePolicy)).toBe(2000);
  });

  it("caps at maxDelayMs", () => {
    const result = calculateBackoffMs(100, basePolicy);
    expect(result).toBeLessThanOrEqual(basePolicy.maxDelayMs);
  });

  it("applies jitter within bounds", () => {
    const jitterPolicy = { ...basePolicy, jitterFactor: 0.5 };
    const results = Array.from({ length: 100 }, () =>
      calculateBackoffMs(0, jitterPolicy)
    );
    const min = Math.min(...results);
    const max = Math.max(...results);
    expect(min).toBeGreaterThanOrEqual(500);
    expect(max).toBeLessThanOrEqual(1500);
  });

  it("never returns negative", () => {
    const policy = { ...basePolicy, jitterFactor: 1 };
    const results = Array.from({ length: 100 }, () =>
      calculateBackoffMs(0, policy)
    );
    for (const r of results) {
      expect(r).toBeGreaterThanOrEqual(0);
    }
  });
});
