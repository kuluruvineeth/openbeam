import { describe, expect, it } from "bun:test";

function cubicEaseOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

describe("cubicEaseOut", () => {
  it("returns 0 at t=0", () => {
    expect(cubicEaseOut(0)).toBe(0);
  });

  it("returns 1 at t=1", () => {
    expect(cubicEaseOut(1)).toBe(1);
  });

  it("returns approximately 0.875 at t=0.5", () => {
    expect(cubicEaseOut(0.5)).toBeCloseTo(0.875, 10);
  });

  it("is monotonically increasing over [0, 1]", () => {
    const steps = 100;
    let previous = cubicEaseOut(0);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const current = cubicEaseOut(t);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it("outputs stay within [0, 1] for inputs in [0, 1]", () => {
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const result = cubicEaseOut(t);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it("starts fast and decelerates (ease-out characteristic)", () => {
    const earlyDelta = cubicEaseOut(0.1) - cubicEaseOut(0);
    const lateDelta = cubicEaseOut(1) - cubicEaseOut(0.9);
    expect(earlyDelta).toBeGreaterThan(lateDelta);
  });

  it("returns correct value at t=0.25", () => {
    const expected = 1 - (1 - 0.25) ** 3;
    expect(cubicEaseOut(0.25)).toBeCloseTo(expected, 10);
  });

  it("returns correct value at t=0.75", () => {
    const expected = 1 - (1 - 0.75) ** 3;
    expect(cubicEaseOut(0.75)).toBeCloseTo(expected, 10);
  });

  it("produces correct linear interpolation between two values", () => {
    const start = 100;
    const end = 500;
    const t = 0.5;
    const eased = cubicEaseOut(t);
    const interpolated = start + (end - start) * eased;
    expect(interpolated).toBeCloseTo(start + (end - start) * 0.875, 10);
  });

  it("interpolation reaches target at t=1", () => {
    const start = 50;
    const end = 250;
    const eased = cubicEaseOut(1);
    const interpolated = start + (end - start) * eased;
    expect(interpolated).toBeCloseTo(end, 10);
  });

  it("interpolation stays at start at t=0", () => {
    const start = 50;
    const end = 250;
    const eased = cubicEaseOut(0);
    const interpolated = start + (end - start) * eased;
    expect(interpolated).toBeCloseTo(start, 10);
  });
});
