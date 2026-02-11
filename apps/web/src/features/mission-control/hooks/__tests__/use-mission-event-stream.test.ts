import { describe, expect, it } from "bun:test";
import { getBackoffDelay } from "../use-mission-event-stream";

describe("getBackoffDelay", () => {
  it("returns 1000ms for first retry", () => {
    expect(getBackoffDelay(0)).toBe(1000);
  });

  it("returns 2000ms for second retry", () => {
    expect(getBackoffDelay(1)).toBe(2000);
  });

  it("returns 4000ms for third retry", () => {
    expect(getBackoffDelay(2)).toBe(4000);
  });

  it("returns 8000ms for fourth retry", () => {
    expect(getBackoffDelay(3)).toBe(8000);
  });

  it("returns 16000ms for fifth retry", () => {
    expect(getBackoffDelay(4)).toBe(16_000);
  });

  it("caps at 30000ms", () => {
    expect(getBackoffDelay(5)).toBe(30_000);
    expect(getBackoffDelay(6)).toBe(30_000);
    expect(getBackoffDelay(10)).toBe(30_000);
    expect(getBackoffDelay(100)).toBe(30_000);
  });
});
