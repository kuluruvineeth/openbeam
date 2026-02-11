import { describe, expect, it } from "bun:test";
import { pointInPolygon } from "../use-lasso-selection";

describe("pointInPolygon", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it("returns true for a point inside the polygon", () => {
    expect(pointInPolygon({ x: 50, y: 50 }, square)).toBe(true);
  });

  it("returns false for a point outside the polygon", () => {
    expect(pointInPolygon({ x: 150, y: 50 }, square)).toBe(false);
  });

  it("returns false for a point above the polygon", () => {
    expect(pointInPolygon({ x: 50, y: -10 }, square)).toBe(false);
  });

  it("returns false for a point below the polygon", () => {
    expect(pointInPolygon({ x: 50, y: 110 }, square)).toBe(false);
  });

  it("returns false for a polygon with fewer than 3 points", () => {
    expect(
      pointInPolygon({ x: 50, y: 50 }, [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ])
    ).toBe(false);
  });

  it("handles a triangle", () => {
    const triangle = [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    expect(pointInPolygon({ x: 50, y: 50 }, triangle)).toBe(true);
    expect(pointInPolygon({ x: 10, y: 10 }, triangle)).toBe(false);
  });

  it("handles a concave L-shape polygon", () => {
    const lShape = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    expect(pointInPolygon({ x: 25, y: 25 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 25, y: 75 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 75, y: 75 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 75, y: 25 }, lShape)).toBe(false);
  });

  it("returns false for an empty polygon", () => {
    expect(pointInPolygon({ x: 0, y: 0 }, [])).toBe(false);
  });

  it("handles points at negative coordinates", () => {
    const negativeSquare = [
      { x: -100, y: -100 },
      { x: 0, y: -100 },
      { x: 0, y: 0 },
      { x: -100, y: 0 },
    ];

    expect(pointInPolygon({ x: -50, y: -50 }, negativeSquare)).toBe(true);
    expect(pointInPolygon({ x: 50, y: 50 }, negativeSquare)).toBe(false);
  });
});
