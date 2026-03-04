import { describe, expect, test } from "bun:test";
import { nextRun, parseCron } from "../cron";

describe("parseCron", () => {
  test("parses wildcard expression", () => {
    const result = parseCron("* * * * *");
    expect(result.minute).toBeNull();
    expect(result.hour).toBeNull();
    expect(result.dayOfMonth).toBeNull();
    expect(result.month).toBeNull();
    expect(result.dayOfWeek).toBeNull();
  });

  test("parses specific values", () => {
    const result = parseCron("30 14 1 6 3");
    expect(result.minute).toEqual([30]);
    expect(result.hour).toEqual([14]);
    expect(result.dayOfMonth).toEqual([1]);
    expect(result.month).toEqual([6]);
    expect(result.dayOfWeek).toEqual([3]);
  });

  test("parses step values", () => {
    const result = parseCron("*/15 */6 * * *");
    expect(result.minute).toEqual([0, 15, 30, 45]);
    expect(result.hour).toEqual([0, 6, 12, 18]);
  });

  test("parses comma-separated values", () => {
    const result = parseCron("0,30 * * * *");
    expect(result.minute).toEqual([0, 30]);
  });

  test("throws on invalid field count", () => {
    expect(() => parseCron("* * *")).toThrow("expected 5 fields");
  });

  test("throws on out-of-range value", () => {
    expect(() => parseCron("60 * * * *")).toThrow();
  });

  test("throws on invalid step", () => {
    expect(() => parseCron("*/0 * * * *")).toThrow("Invalid cron step");
  });

  test("parses every-5-minutes", () => {
    const result = parseCron("*/5 * * * *");
    expect(result.minute).toEqual([
      0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
    ]);
  });
});

describe("nextRun", () => {
  test("returns a future date", () => {
    const now = new Date();
    const result = nextRun("* * * * *", now);
    expect(result.getTime()).toBeGreaterThan(now.getTime());
  });

  test("respects minute field", () => {
    const after = new Date(2025, 0, 1, 12, 0, 0);
    const result = nextRun("30 * * * *", after);
    expect(result.getMinutes()).toBe(30);
  });

  test("respects hour field", () => {
    const after = new Date(2025, 0, 1, 10, 0, 0);
    const result = nextRun("0 14 * * *", after);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(0);
  });

  test("every-5-minutes from specific time", () => {
    const after = new Date(2025, 0, 1, 12, 3, 0);
    const result = nextRun("*/5 * * * *", after);
    expect(result.getMinutes() % 5).toBe(0);
    expect(result.getMinutes()).toBe(5);
  });

  test("rolls to next day if no match today", () => {
    const after = new Date(2025, 0, 1, 23, 59, 0);
    const result = nextRun("0 8 * * *", after);
    expect(result.getDate()).toBe(2);
    expect(result.getHours()).toBe(8);
  });

  test("respects day of week", () => {
    const monday = new Date(2025, 0, 6, 12, 0, 0);
    const result = nextRun("0 12 * * 5", monday);
    expect(result.getDay()).toBe(5);
  });
});
