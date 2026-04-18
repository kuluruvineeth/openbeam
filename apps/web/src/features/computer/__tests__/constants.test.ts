import { describe, expect, it } from "bun:test";
import {
  AGENT_STATUS_STYLES,
  humanCron,
  RUN_STATUS_BADGE,
  RUN_STATUS_COLOR,
} from "../constants";

const BADGE_CLASS_PATTERN = /bg-|border-/;

describe("humanCron", () => {
  it("translates known cron expressions to human labels", () => {
    expect(humanCron("0 8 * * 1")).toBe("Weekly \u00b7 Mon 8am");
    expect(humanCron("0 */6 * * *")).toBe("Every 6 hours");
    expect(humanCron("0 0 * * *")).toBe("Daily \u00b7 midnight");
    expect(humanCron("0 6 * * *")).toBe("Daily \u00b7 6am");
  });

  it("returns the raw expression for unknown schedules", () => {
    expect(humanCron("15 3 * * 5")).toBe("15 3 * * 5");
    expect(humanCron("*/5 * * * *")).toBe("*/5 * * * *");
  });

  it("handles empty string by returning it unchanged", () => {
    expect(humanCron("")).toBe("");
  });
});

describe("RUN_STATUS_COLOR", () => {
  it("maps every expected run status to a color", () => {
    expect(RUN_STATUS_COLOR.COMPLETED).toBe("text-emerald-600");
    expect(RUN_STATUS_COLOR.FAILED).toBe("text-destructive");
    expect(RUN_STATUS_COLOR.RUNNING).toBe("text-amber-600");
    expect(RUN_STATUS_COLOR.WAITING_APPROVAL).toBe("text-violet-600");
    expect(RUN_STATUS_COLOR.PENDING).toBe("text-muted-foreground");
  });
});

describe("RUN_STATUS_BADGE", () => {
  it("includes REJECTED distinct from PENDING", () => {
    expect(RUN_STATUS_BADGE.REJECTED).toBeDefined();
    expect(RUN_STATUS_BADGE.REJECTED).not.toBe(RUN_STATUS_BADGE.PENDING);
  });

  it("returns badge classes for all run statuses", () => {
    const statuses = [
      "COMPLETED",
      "FAILED",
      "RUNNING",
      "PENDING",
      "WAITING_APPROVAL",
      "REJECTED",
    ];
    for (const status of statuses) {
      const badge = RUN_STATUS_BADGE[status] ?? "";
      expect(BADGE_CLASS_PATTERN.test(badge)).toBe(true);
    }
  });
});

describe("AGENT_STATUS_STYLES", () => {
  it("provides styles for all agent status enum values", () => {
    const statuses = ["ACTIVE", "PAUSED", "DRAFT", "ERROR", "ARCHIVED"];
    for (const status of statuses) {
      expect(AGENT_STATUS_STYLES[status]).toBeDefined();
    }
  });
});
