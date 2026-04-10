import { describe, expect, it } from "bun:test";
import { isInQuietHours } from "../quiet-hours";

describe("isInQuietHours", () => {
  it("returns false when no quiet hours configured", () => {
    expect(
      isInQuietHours({
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: "UTC",
      })
    ).toBe(false);
  });

  it("detects same-day quiet hours (9pm-6am, currently 10pm UTC)", () => {
    expect(
      isInQuietHours({
        quietHoursStart: 21,
        quietHoursEnd: 6,
        timezone: "UTC",
        now: new Date("2026-04-10T22:00:00Z"),
      })
    ).toBe(true);
  });

  it("detects outside same-day quiet hours (9pm-6am, currently 2pm UTC)", () => {
    expect(
      isInQuietHours({
        quietHoursStart: 21,
        quietHoursEnd: 6,
        timezone: "UTC",
        now: new Date("2026-04-10T14:00:00Z"),
      })
    ).toBe(false);
  });

  it("detects non-wrapping quiet hours (9am-5pm, currently 11am UTC)", () => {
    expect(
      isInQuietHours({
        quietHoursStart: 9,
        quietHoursEnd: 17,
        timezone: "UTC",
        now: new Date("2026-04-10T11:00:00Z"),
      })
    ).toBe(true);
  });

  it("detects outside non-wrapping quiet hours (9am-5pm, currently 8pm UTC)", () => {
    expect(
      isInQuietHours({
        quietHoursStart: 9,
        quietHoursEnd: 17,
        timezone: "UTC",
        now: new Date("2026-04-10T20:00:00Z"),
      })
    ).toBe(false);
  });
});
