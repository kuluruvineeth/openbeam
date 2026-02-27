import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react-native", () => ({
  Check: "Check",
  Clock: "Clock",
  Loader2: "Loader2",
  X: "X",
  AlertCircle: "AlertCircle",
}));

import {
  getSyncHistoryStatusConfig,
  getSyncStatusConfig,
  isSyncingStatus,
  SYNC_HISTORY_STATUS_CONFIG,
  SYNC_STATUS_CONFIG,
} from "./sync-status";

describe("getSyncStatusConfig", () => {
  it("returns config for known statuses", () => {
    expect(getSyncStatusConfig("ACTIVE").label).toBe("Indexed");
    expect(getSyncStatusConfig("SYNCING").label).toBe("Syncing");
    expect(getSyncStatusConfig("ERROR").label).toBe("Error");
    expect(getSyncStatusConfig("CONNECTING").label).toBe("Connecting");
  });

  it("defaults to ACTIVE for null/undefined", () => {
    expect(getSyncStatusConfig(null).label).toBe("Indexed");
    expect(getSyncStatusConfig(undefined).label).toBe("Indexed");
  });

  it("defaults to ACTIVE for unknown statuses", () => {
    expect(getSyncStatusConfig("UNKNOWN").label).toBe("Indexed");
  });

  it("animated flag is correct", () => {
    expect(SYNC_STATUS_CONFIG.SYNCING.animated).toBe(true);
    expect(SYNC_STATUS_CONFIG.CONNECTING.animated).toBe(true);
    expect(SYNC_STATUS_CONFIG.ACTIVE.animated).toBe(false);
    expect(SYNC_STATUS_CONFIG.ERROR.animated).toBe(false);
  });
});

describe("getSyncHistoryStatusConfig", () => {
  it("returns config for known history statuses", () => {
    expect(getSyncHistoryStatusConfig("COMPLETED").label).toBe("Success");
    expect(getSyncHistoryStatusConfig("FAILED").label).toBe("Failed");
    expect(getSyncHistoryStatusConfig("RUNNING").label).toBe("Syncing");
  });

  it("returns PARTIAL for COMPLETED with error", () => {
    const config = getSyncHistoryStatusConfig("COMPLETED", "Some error");
    expect(config.label).toBe("Partial");
    expect(config.color).toBe("#f97316");
  });

  it("returns COMPLETED config when no error", () => {
    const config = getSyncHistoryStatusConfig("COMPLETED", null);
    expect(config.label).toBe("Success");
  });

  it("defaults to COMPLETED for null/undefined", () => {
    expect(getSyncHistoryStatusConfig(null).label).toBe("Success");
    expect(getSyncHistoryStatusConfig(undefined).label).toBe("Success");
  });

  it("has all 9 history statuses configured", () => {
    const statuses = Object.keys(SYNC_HISTORY_STATUS_CONFIG);
    expect(statuses).toHaveLength(9);
    expect(statuses).toContain("PENDING");
    expect(statuses).toContain("QUEUED");
    expect(statuses).toContain("RUNNING");
    expect(statuses).toContain("PAUSED");
    expect(statuses).toContain("COMPLETED");
    expect(statuses).toContain("FAILED");
    expect(statuses).toContain("CANCELLED");
    expect(statuses).toContain("TIMEOUT");
    expect(statuses).toContain("PARTIAL");
  });
});

describe("isSyncingStatus", () => {
  it("returns true for syncing statuses", () => {
    expect(isSyncingStatus("RUNNING")).toBe(true);
    expect(isSyncingStatus("SYNCING")).toBe(true);
  });

  it("returns false for non-syncing statuses", () => {
    expect(isSyncingStatus("COMPLETED")).toBe(false);
    expect(isSyncingStatus("FAILED")).toBe(false);
    expect(isSyncingStatus("ACTIVE")).toBe(false);
    expect(isSyncingStatus(null)).toBe(false);
    expect(isSyncingStatus(undefined)).toBe(false);
  });
});
