import { TIMEOUT_TIERS } from "@openplane/types/temporal/agent-timeouts";
import { describe, expect, it } from "vitest";
import {
  computeHeartbeatInterval,
  computeHeartbeatIntervalMs,
} from "../config/timeouts";

describe("computeHeartbeatInterval", () => {
  it("returns 10s for 30s timeout", () => {
    expect(computeHeartbeatInterval("30s")).toBe("10s");
  });

  it("returns 40s for 2m timeout", () => {
    expect(computeHeartbeatInterval("2m")).toBe("40s");
  });

  it("returns 100s for 5m timeout", () => {
    expect(computeHeartbeatInterval("5m")).toBe("100s");
  });

  it("returns 1h for 3h timeout", () => {
    expect(computeHeartbeatInterval("3h")).toBe("1h");
  });

  it("enforces 5s minimum floor", () => {
    expect(computeHeartbeatInterval("10s")).toBe("5s");
    expect(computeHeartbeatInterval("5s")).toBe("5s");
  });
});

describe("computeHeartbeatIntervalMs", () => {
  it("returns 10000 for 30000ms", () => {
    expect(computeHeartbeatIntervalMs(30_000)).toBe(10_000);
  });

  it("enforces 5000ms minimum floor", () => {
    expect(computeHeartbeatIntervalMs(12_000)).toBe(5000);
  });
});

const TIMEOUT_REGEX = /^(\d+)(s|m|h)$/;

function unitToMs(unit: string): number {
  if (unit === "s") {
    return 1000;
  }
  if (unit === "m") {
    return 60_000;
  }
  return 3_600_000;
}

describe("TIMEOUT_TIERS heartbeat ratios", () => {
  it("all tiers enforce at least 3:1 heartbeat ratio", () => {
    for (const [tierName, config] of Object.entries(TIMEOUT_TIERS)) {
      const timeoutMatch = config.heartbeatTimeout.match(TIMEOUT_REGEX);
      expect(
        timeoutMatch,
        `${tierName} has valid heartbeatTimeout`
      ).toBeTruthy();
      const timeoutMs =
        Number(timeoutMatch?.[1]) * unitToMs(timeoutMatch?.[2] ?? "s");
      const ratio = timeoutMs / config.heartbeatIntervalMs;
      expect(
        ratio,
        `${tierName} ratio ${ratio} should be >= 3`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("quick tier has 10000ms heartbeatIntervalMs", () => {
    expect(TIMEOUT_TIERS.quick.heartbeatIntervalMs).toBe(10_000);
  });

  it("standard tier has 40000ms heartbeatIntervalMs", () => {
    expect(TIMEOUT_TIERS.standard.heartbeatIntervalMs).toBe(40_000);
  });

  it("extended tier has 100000ms heartbeatIntervalMs", () => {
    expect(TIMEOUT_TIERS.extended.heartbeatIntervalMs).toBe(100_000);
  });

  it("marathon tier has 200000ms heartbeatIntervalMs", () => {
    expect(TIMEOUT_TIERS.marathon.heartbeatIntervalMs).toBe(200_000);
  });
});
