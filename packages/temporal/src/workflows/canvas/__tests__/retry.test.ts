import type { RetryNodeConfig } from "@openplane/types/canvas";
import { describe, expect, it } from "vitest";
import {
  hashSeed,
  resolveJitterMs,
  resolveRetryDelayMs,
  shouldRetry,
} from "../utils/retry";

describe("hashSeed", () => {
  it("returns consistent hash for same input", () => {
    const hash1 = hashSeed("test-seed");
    const hash2 = hashSeed("test-seed");

    expect(hash1).toBe(hash2);
  });

  it("returns different hash for different inputs", () => {
    const hash1 = hashSeed("seed-a");
    const hash2 = hashSeed("seed-b");

    expect(hash1).not.toBe(hash2);
  });

  it("returns 0 for empty string", () => {
    const result = hashSeed("");

    expect(result).toBe(0);
  });

  it("returns non-negative number", () => {
    const inputs = [
      "test",
      "workflow-123",
      "node-abc",
      "very-long-string-with-lots-of-characters",
    ];

    for (const input of inputs) {
      expect(hashSeed(input)).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles unicode characters", () => {
    const hash = hashSeed("测试");

    expect(typeof hash).toBe("number");
    expect(hash).toBeGreaterThanOrEqual(0);
  });
});

describe("resolveJitterMs", () => {
  it("returns 0 when jitterMs is 0", () => {
    const result = resolveJitterMs("any-seed", 0);

    expect(result).toBe(0);
  });

  it("returns 0 when jitterMs is negative", () => {
    const result = resolveJitterMs("any-seed", -100);

    expect(result).toBe(0);
  });

  it("returns value within jitter range", () => {
    const jitterMs = 100;

    for (let i = 0; i < 10; i += 1) {
      const result = resolveJitterMs(`seed-${i}`, jitterMs);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(jitterMs);
    }
  });

  it("returns consistent jitter for same seed", () => {
    const result1 = resolveJitterMs("fixed-seed", 1000);
    const result2 = resolveJitterMs("fixed-seed", 1000);

    expect(result1).toBe(result2);
  });

  it("returns different jitter for different seeds", () => {
    const result1 = resolveJitterMs("seed-1", 1000);
    const result2 = resolveJitterMs("seed-2", 1000);

    expect(result1).not.toBe(result2);
  });
});

describe("resolveRetryDelayMs", () => {
  it("returns base delay without exponential backoff", () => {
    const config: RetryNodeConfig = {
      maxAttempts: 3,
      backoffMs: 1000,
      exponential: false,
    };

    expect(resolveRetryDelayMs({ attempt: 1, config, seed: "test" })).toBe(
      1000
    );
    expect(resolveRetryDelayMs({ attempt: 2, config, seed: "test" })).toBe(
      1000
    );
    expect(resolveRetryDelayMs({ attempt: 3, config, seed: "test" })).toBe(
      1000
    );
  });

  it("returns exponential delay with exponential backoff", () => {
    const config: RetryNodeConfig = {
      maxAttempts: 5,
      backoffMs: 1000,
      exponential: true,
    };

    expect(resolveRetryDelayMs({ attempt: 1, config, seed: "test" })).toBe(
      1000
    );
    expect(resolveRetryDelayMs({ attempt: 2, config, seed: "test" })).toBe(
      2000
    );
    expect(resolveRetryDelayMs({ attempt: 3, config, seed: "test" })).toBe(
      4000
    );
    expect(resolveRetryDelayMs({ attempt: 4, config, seed: "test" })).toBe(
      8000
    );
  });

  it("adds jitter when configured", () => {
    const config: RetryNodeConfig = {
      maxAttempts: 3,
      backoffMs: 1000,
      exponential: false,
      jitterMs: 500,
    };

    const result = resolveRetryDelayMs({ attempt: 1, config, seed: "test" });

    expect(result).toBeGreaterThanOrEqual(1000);
    expect(result).toBeLessThanOrEqual(1500);
  });

  it("combines exponential backoff with jitter", () => {
    const config: RetryNodeConfig = {
      maxAttempts: 3,
      backoffMs: 1000,
      exponential: true,
      jitterMs: 200,
    };

    const result = resolveRetryDelayMs({ attempt: 3, config, seed: "test" });

    expect(result).toBeGreaterThanOrEqual(4000);
    expect(result).toBeLessThanOrEqual(4200);
  });

  it("returns same delay for same seed and attempt", () => {
    const config: RetryNodeConfig = {
      maxAttempts: 3,
      backoffMs: 1000,
      exponential: true,
      jitterMs: 500,
    };

    const result1 = resolveRetryDelayMs({ attempt: 2, config, seed: "fixed" });
    const result2 = resolveRetryDelayMs({ attempt: 2, config, seed: "fixed" });

    expect(result1).toBe(result2);
  });

  it("handles zero backoff", () => {
    const config: RetryNodeConfig = {
      maxAttempts: 3,
      backoffMs: 0,
      exponential: true,
    };

    const result = resolveRetryDelayMs({ attempt: 3, config, seed: "test" });

    expect(result).toBe(0);
  });

  it("handles undefined jitterMs", () => {
    const config: RetryNodeConfig = {
      maxAttempts: 3,
      backoffMs: 1000,
      exponential: false,
      jitterMs: undefined,
    };

    const result = resolveRetryDelayMs({ attempt: 1, config, seed: "test" });

    expect(result).toBe(1000);
  });
});

describe("shouldRetry", () => {
  it("returns true when attempt is less than maxAttempts", () => {
    expect(shouldRetry({ attempt: 1, maxAttempts: 3 })).toBe(true);
    expect(shouldRetry({ attempt: 2, maxAttempts: 3 })).toBe(true);
  });

  it("returns false when attempt equals maxAttempts", () => {
    expect(shouldRetry({ attempt: 3, maxAttempts: 3 })).toBe(false);
  });

  it("returns false when attempt exceeds maxAttempts", () => {
    expect(shouldRetry({ attempt: 5, maxAttempts: 3 })).toBe(false);
  });

  it("returns false when maxAttempts is 1", () => {
    expect(shouldRetry({ attempt: 1, maxAttempts: 1 })).toBe(false);
  });

  it("returns false when maxAttempts is 0", () => {
    expect(shouldRetry({ attempt: 0, maxAttempts: 0 })).toBe(false);
    expect(shouldRetry({ attempt: 1, maxAttempts: 0 })).toBe(false);
  });
});
