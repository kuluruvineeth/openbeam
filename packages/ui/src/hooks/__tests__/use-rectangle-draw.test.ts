import { describe, expect, it } from "bun:test";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

function computeRect(origin: Point, current: Point): Rect {
  return {
    x: Math.min(origin.x, current.x),
    y: Math.min(origin.y, current.y),
    width: Math.abs(current.x - origin.x),
    height: Math.abs(current.y - origin.y),
  };
}

function rectToCornerPoints(rect: Rect): Point[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

describe("computeRect", () => {
  it("computes rect from top-left to bottom-right drag", () => {
    const rect = computeRect({ x: 10, y: 20 }, { x: 110, y: 80 });
    expect(rect).toEqual({ x: 10, y: 20, width: 100, height: 60 });
  });

  it("normalizes rect from bottom-right to top-left drag", () => {
    const rect = computeRect({ x: 110, y: 80 }, { x: 10, y: 20 });
    expect(rect).toEqual({ x: 10, y: 20, width: 100, height: 60 });
  });

  it("handles horizontal-only drag", () => {
    const rect = computeRect({ x: 0, y: 50 }, { x: 200, y: 50 });
    expect(rect).toEqual({ x: 0, y: 50, width: 200, height: 0 });
  });

  it("handles vertical-only drag", () => {
    const rect = computeRect({ x: 50, y: 0 }, { x: 50, y: 150 });
    expect(rect).toEqual({ x: 50, y: 0, width: 0, height: 150 });
  });

  it("produces zero-size rect when origin equals current", () => {
    const rect = computeRect({ x: 75, y: 75 }, { x: 75, y: 75 });
    expect(rect).toEqual({ x: 75, y: 75, width: 0, height: 0 });
  });

  it("handles negative coordinates", () => {
    const rect = computeRect({ x: -50, y: -30 }, { x: -10, y: -5 });
    expect(rect).toEqual({ x: -50, y: -30, width: 40, height: 25 });
  });

  it("normalizes reverse drag with negative coordinates", () => {
    const rect = computeRect({ x: 20, y: 30 }, { x: -40, y: -10 });
    expect(rect).toEqual({ x: -40, y: -10, width: 60, height: 40 });
  });

  it("handles large coordinate values", () => {
    const rect = computeRect({ x: 0, y: 0 }, { x: 10_000, y: 8000 });
    expect(rect).toEqual({ x: 0, y: 0, width: 10_000, height: 8000 });
  });
});

describe("rectToCornerPoints", () => {
  it("returns four corners in TL, TR, BR, BL order", () => {
    const corners = rectToCornerPoints({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    });
    expect(corners).toEqual([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 80 },
      { x: 10, y: 80 },
    ]);
  });

  it("returns exactly 4 points", () => {
    const corners = rectToCornerPoints({ x: 0, y: 0, width: 50, height: 50 });
    expect(corners).toHaveLength(4);
  });

  it("handles zero-width rect with collapsed horizontal points", () => {
    const corners = rectToCornerPoints({ x: 30, y: 10, width: 0, height: 40 });
    expect(corners[0]).toEqual({ x: 30, y: 10 });
    expect(corners[1]).toEqual({ x: 30, y: 10 });
    expect(corners[2]).toEqual({ x: 30, y: 50 });
    expect(corners[3]).toEqual({ x: 30, y: 50 });
  });

  it("handles zero-height rect with collapsed vertical points", () => {
    const corners = rectToCornerPoints({ x: 10, y: 25, width: 80, height: 0 });
    expect(corners[0]).toEqual({ x: 10, y: 25 });
    expect(corners[1]).toEqual({ x: 90, y: 25 });
    expect(corners[2]).toEqual({ x: 90, y: 25 });
    expect(corners[3]).toEqual({ x: 10, y: 25 });
  });

  it("handles large rect", () => {
    const corners = rectToCornerPoints({
      x: 0,
      y: 0,
      width: 5000,
      height: 3000,
    });
    expect(corners[2]).toEqual({ x: 5000, y: 3000 });
  });

  it("handles rect at negative origin", () => {
    const corners = rectToCornerPoints({
      x: -100,
      y: -50,
      width: 200,
      height: 100,
    });
    expect(corners).toEqual([
      { x: -100, y: -50 },
      { x: 100, y: -50 },
      { x: 100, y: 50 },
      { x: -100, y: 50 },
    ]);
  });

  it("roundtrips with computeRect for normal drag", () => {
    const origin = { x: 10, y: 20 };
    const current = { x: 110, y: 80 };
    const rect = computeRect(origin, current);
    const corners = rectToCornerPoints(rect);
    expect(corners[0]).toEqual({ x: rect.x, y: rect.y });
    expect(corners[2]).toEqual({
      x: rect.x + rect.width,
      y: rect.y + rect.height,
    });
  });

  it("roundtrips with computeRect for reverse drag", () => {
    const origin = { x: 200, y: 150 };
    const current = { x: 50, y: 30 };
    const rect = computeRect(origin, current);
    const corners = rectToCornerPoints(rect);
    expect(corners[0]).toEqual({ x: 50, y: 30 });
    expect(corners[2]).toEqual({ x: 200, y: 150 });
  });
});
