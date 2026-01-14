import { describe, expect, it } from "bun:test";
import type {
  CheckStatus,
  ConnectorHealthResult,
  HealthCheck,
  HealthStatus,
} from "../connector-health";
import {
  getFailedChecks,
  getWarningChecks,
  isHealthy,
  needsAttention,
} from "../connector-health";

function createMockHealthCheck(
  overrides: Partial<HealthCheck> = {}
): HealthCheck {
  return {
    name: "test_check",
    status: "pass",
    ...overrides,
  };
}

function createMockHealthResult(
  overrides: Partial<ConnectorHealthResult> = {}
): ConnectorHealthResult {
  return {
    connectorId: "conn_123",
    connectorType: "LINEAR" as const,
    connectorName: "Linear",
    status: "healthy",
    checks: [
      createMockHealthCheck({ name: "credentials", status: "pass" }),
      createMockHealthCheck({ name: "token_validity", status: "pass" }),
      createMockHealthCheck({ name: "api_connectivity", status: "pass" }),
      createMockHealthCheck({ name: "configuration", status: "pass" }),
    ],
    checkedAt: new Date(),
    ...overrides,
  };
}

describe("HealthStatus values", () => {
  it("includes all expected statuses", () => {
    const statuses: HealthStatus[] = [
      "healthy",
      "degraded",
      "unhealthy",
      "unknown",
    ];

    expect(statuses).toContain("healthy");
    expect(statuses).toContain("degraded");
    expect(statuses).toContain("unhealthy");
    expect(statuses).toContain("unknown");
  });
});

describe("CheckStatus values", () => {
  it("includes all expected statuses", () => {
    const statuses: CheckStatus[] = ["pass", "fail", "warn", "skip"];

    expect(statuses).toContain("pass");
    expect(statuses).toContain("fail");
    expect(statuses).toContain("warn");
    expect(statuses).toContain("skip");
  });
});

describe("isHealthy", () => {
  it("returns true for healthy status", () => {
    const result = createMockHealthResult({ status: "healthy" });
    expect(isHealthy(result)).toBe(true);
  });

  it("returns false for degraded status", () => {
    const result = createMockHealthResult({ status: "degraded" });
    expect(isHealthy(result)).toBe(false);
  });

  it("returns false for unhealthy status", () => {
    const result = createMockHealthResult({ status: "unhealthy" });
    expect(isHealthy(result)).toBe(false);
  });

  it("returns false for unknown status", () => {
    const result = createMockHealthResult({ status: "unknown" });
    expect(isHealthy(result)).toBe(false);
  });
});

describe("needsAttention", () => {
  it("returns false for healthy status", () => {
    const result = createMockHealthResult({ status: "healthy" });
    expect(needsAttention(result)).toBe(false);
  });

  it("returns true for degraded status", () => {
    const result = createMockHealthResult({ status: "degraded" });
    expect(needsAttention(result)).toBe(true);
  });

  it("returns true for unhealthy status", () => {
    const result = createMockHealthResult({ status: "unhealthy" });
    expect(needsAttention(result)).toBe(true);
  });

  it("returns false for unknown status", () => {
    const result = createMockHealthResult({ status: "unknown" });
    expect(needsAttention(result)).toBe(false);
  });
});

describe("getFailedChecks", () => {
  it("returns empty array when no failed checks", () => {
    const result = createMockHealthResult({
      checks: [
        createMockHealthCheck({ name: "test1", status: "pass" }),
        createMockHealthCheck({ name: "test2", status: "warn" }),
      ],
    });

    const failed = getFailedChecks(result);
    expect(failed).toHaveLength(0);
  });

  it("returns only failed checks", () => {
    const result = createMockHealthResult({
      checks: [
        createMockHealthCheck({ name: "credentials", status: "fail" }),
        createMockHealthCheck({ name: "token_validity", status: "pass" }),
        createMockHealthCheck({ name: "api_connectivity", status: "fail" }),
        createMockHealthCheck({ name: "configuration", status: "warn" }),
      ],
    });

    const failed = getFailedChecks(result);
    expect(failed).toHaveLength(2);
    expect(failed[0]?.name).toBe("credentials");
    expect(failed[1]?.name).toBe("api_connectivity");
  });

  it("does not include warn or skip as failures", () => {
    const result = createMockHealthResult({
      checks: [
        createMockHealthCheck({ name: "test1", status: "warn" }),
        createMockHealthCheck({ name: "test2", status: "skip" }),
      ],
    });

    const failed = getFailedChecks(result);
    expect(failed).toHaveLength(0);
  });
});

describe("getWarningChecks", () => {
  it("returns empty array when no warnings", () => {
    const result = createMockHealthResult({
      checks: [
        createMockHealthCheck({ name: "test1", status: "pass" }),
        createMockHealthCheck({ name: "test2", status: "fail" }),
      ],
    });

    const warnings = getWarningChecks(result);
    expect(warnings).toHaveLength(0);
  });

  it("returns only warning checks", () => {
    const result = createMockHealthResult({
      checks: [
        createMockHealthCheck({ name: "credentials", status: "pass" }),
        createMockHealthCheck({
          name: "token_validity",
          status: "warn",
          message: "Token expires soon",
        }),
        createMockHealthCheck({
          name: "api_connectivity",
          status: "warn",
          message: "Rate limited",
        }),
        createMockHealthCheck({ name: "configuration", status: "fail" }),
      ],
    });

    const warnings = getWarningChecks(result);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]?.name).toBe("token_validity");
    expect(warnings[1]?.name).toBe("api_connectivity");
  });
});

describe("HealthCheck structure", () => {
  it("includes optional message", () => {
    const check = createMockHealthCheck({
      name: "api_connectivity",
      status: "fail",
      message: "Connection refused",
    });

    expect(check.message).toBe("Connection refused");
  });

  it("includes optional latency", () => {
    const check = createMockHealthCheck({
      name: "api_connectivity",
      status: "pass",
      latencyMs: 150,
    });

    expect(check.latencyMs).toBe(150);
  });

  it("can have undefined optional fields", () => {
    const check = createMockHealthCheck({
      name: "test",
      status: "pass",
    });

    expect(check.message).toBeUndefined();
    expect(check.latencyMs).toBeUndefined();
  });
});

describe("ConnectorHealthResult structure", () => {
  it("has all required fields", () => {
    const result = createMockHealthResult();

    expect(result.connectorId).toBeDefined();
    expect(result.connectorType).toBeDefined();
    expect(result.connectorName).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.checks).toBeDefined();
    expect(result.checkedAt).toBeDefined();
  });

  it("checks array is not empty for real health check", () => {
    const result = createMockHealthResult();

    expect(result.checks.length).toBeGreaterThan(0);
  });

  it("checkedAt is a Date", () => {
    const result = createMockHealthResult();

    expect(result.checkedAt).toBeInstanceOf(Date);
  });
});

describe("status derivation logic", () => {
  it("all pass -> healthy", () => {
    const result = createMockHealthResult({
      status: "healthy",
      checks: [
        createMockHealthCheck({ status: "pass" }),
        createMockHealthCheck({ status: "pass" }),
      ],
    });

    expect(result.status).toBe("healthy");
    expect(isHealthy(result)).toBe(true);
  });

  it("any fail -> unhealthy", () => {
    const result = createMockHealthResult({
      status: "unhealthy",
      checks: [
        createMockHealthCheck({ status: "pass" }),
        createMockHealthCheck({ status: "fail" }),
        createMockHealthCheck({ status: "pass" }),
      ],
    });

    expect(result.status).toBe("unhealthy");
    expect(needsAttention(result)).toBe(true);
  });

  it("warn without fail -> degraded", () => {
    const result = createMockHealthResult({
      status: "degraded",
      checks: [
        createMockHealthCheck({ status: "pass" }),
        createMockHealthCheck({ status: "warn" }),
        createMockHealthCheck({ status: "pass" }),
      ],
    });

    expect(result.status).toBe("degraded");
    expect(needsAttention(result)).toBe(true);
  });

  it("all skip -> unknown", () => {
    const result = createMockHealthResult({
      status: "unknown",
      checks: [
        createMockHealthCheck({ status: "skip" }),
        createMockHealthCheck({ status: "skip" }),
      ],
    });

    expect(result.status).toBe("unknown");
    expect(isHealthy(result)).toBe(false);
    expect(needsAttention(result)).toBe(false);
  });
});
