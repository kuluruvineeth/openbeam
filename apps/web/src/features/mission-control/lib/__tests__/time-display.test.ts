import { describe, expect, it } from "bun:test";
import {
  formatAbsoluteClockTime,
  formatContextualTimestamp,
  formatRelativeTimestamp,
  formatTimelineTimestamp,
} from "../time-display";

describe("formatRelativeTimestamp", () => {
  it("returns just now for sub-minute timestamps", () => {
    const now = 1_700_000_000_000;
    expect(formatRelativeTimestamp(now - 30_000, now)).toBe("just now");
  });
});

describe("formatContextualTimestamp", () => {
  it("uses relative output for recent events", () => {
    const now = 1_700_000_000_000;
    const timestamp = now - 20 * 60_000;

    expect(formatContextualTimestamp(timestamp, now)).toBe(
      formatRelativeTimestamp(timestamp, now)
    );
  });

  it("uses absolute output for older events", () => {
    const now = 1_700_000_000_000;
    const timestamp = now - 3 * 60 * 60_000;

    expect(formatContextualTimestamp(timestamp, now)).toBe(
      formatAbsoluteClockTime(timestamp, now)
    );
  });
});

describe("formatTimelineTimestamp", () => {
  it("prefers relative-first labels for recent activity", () => {
    const now = 1_700_000_000_000;
    const timestamp = now - 15 * 60_000;
    const display = formatTimelineTimestamp(timestamp, now);

    expect(display.primary).toBe(formatRelativeTimestamp(timestamp, now));
    expect(display.secondary).toBe(formatAbsoluteClockTime(timestamp, now));
    expect(display.dateTime).toBe(new Date(timestamp).toISOString());
  });

  it("prefers absolute-first labels for older activity", () => {
    const now = 1_700_000_000_000;
    const timestamp = now - 24 * 60 * 60_000;
    const display = formatTimelineTimestamp(timestamp, now);

    expect(display.primary).toBe(formatAbsoluteClockTime(timestamp, now));
    expect(display.secondary).toBe(formatRelativeTimestamp(timestamp, now));
  });
});
