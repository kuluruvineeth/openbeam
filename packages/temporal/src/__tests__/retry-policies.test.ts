import { describe, expect, it } from "vitest";
import {
  AUDIT_RETRY_POLICY,
  CANVAS_NODE_RETRY_POLICY,
  CANVAS_UPDATE_RETRY_POLICY,
  getRetryPolicyForActivity,
} from "../config/retry-policies";

describe("canvas retry policies", () => {
  it("CANVAS_NODE_RETRY_POLICY has expected configuration", () => {
    expect(CANVAS_NODE_RETRY_POLICY.maximumAttempts).toBe(3);
    expect(CANVAS_NODE_RETRY_POLICY.initialInterval).toBe("2s");
    expect(CANVAS_NODE_RETRY_POLICY.nonRetryableErrorTypes).toContain(
      "AuthorizationError"
    );
    expect(CANVAS_NODE_RETRY_POLICY.nonRetryableErrorTypes).toContain(
      "CanvasNotFoundError"
    );
  });

  it("CANVAS_UPDATE_RETRY_POLICY allows more retries than node policy", () => {
    expect(CANVAS_UPDATE_RETRY_POLICY.maximumAttempts).toBe(5);
    expect(CANVAS_UPDATE_RETRY_POLICY.nonRetryableErrorTypes).toContain(
      "ExecutionNotFoundError"
    );
  });

  it("AUDIT_RETRY_POLICY has conservative configuration", () => {
    expect(AUDIT_RETRY_POLICY.maximumAttempts).toBe(3);
    expect(AUDIT_RETRY_POLICY.maximumInterval).toBe("10s");
  });
});

describe("getRetryPolicyForActivity", () => {
  it("returns CANVAS_NODE_RETRY_POLICY for canvas type", () => {
    expect(getRetryPolicyForActivity("canvas")).toBe(CANVAS_NODE_RETRY_POLICY);
  });

  it("returns CANVAS_UPDATE_RETRY_POLICY for canvasUpdate type", () => {
    expect(getRetryPolicyForActivity("canvasUpdate")).toBe(
      CANVAS_UPDATE_RETRY_POLICY
    );
  });

  it("returns AUDIT_RETRY_POLICY for audit type", () => {
    expect(getRetryPolicyForActivity("audit")).toBe(AUDIT_RETRY_POLICY);
  });

  it("returns default policy for unknown activity types", () => {
    const policy = getRetryPolicyForActivity("unknown-type");
    expect(policy.maximumAttempts).toBe(3);
    expect(policy.initialInterval).toBe("1s");
  });

  it("maps all standard activity types", () => {
    const knownTypes = [
      "sync",
      "fetch",
      "parse",
      "chunk",
      "embed",
      "media",
      "transcode",
      "webhook",
      "storage",
      "database",
      "canvas",
      "canvasUpdate",
      "audit",
    ];

    for (const type of knownTypes) {
      const policy = getRetryPolicyForActivity(type);
      expect(policy.maximumAttempts).toBeGreaterThan(0);
      expect(policy.initialInterval).toBeDefined();
    }
  });
});
