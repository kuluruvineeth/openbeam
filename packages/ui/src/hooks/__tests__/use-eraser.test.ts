import { describe, expect, it } from "bun:test";

const ERASER_RADIUS = 20;

function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

interface TestAnnotation {
  type: "freehand" | "rectangle" | "arrow" | "text";
  points: Array<{ x: number; y: number }>;
}

function freehandIntersects(
  annotation: TestAnnotation,
  cursor: { x: number; y: number }
): boolean {
  return annotation.points.some(
    (point) => distanceBetween(point, cursor) <= ERASER_RADIUS
  );
}

function rectangleIntersects(
  annotation: TestAnnotation,
  cursor: { x: number; y: number }
): boolean {
  if (annotation.points.length < 2) {
    return false;
  }

  const xs = annotation.points.map((p) => p.x);
  const ys = annotation.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return (
    cursor.x >= minX - ERASER_RADIUS &&
    cursor.x <= maxX + ERASER_RADIUS &&
    cursor.y >= minY - ERASER_RADIUS &&
    cursor.y <= maxY + ERASER_RADIUS
  );
}

function annotationIntersects(
  annotation: TestAnnotation,
  cursor: { x: number; y: number }
): boolean {
  switch (annotation.type) {
    case "freehand":
      return freehandIntersects(annotation, cursor);
    case "rectangle":
      return rectangleIntersects(annotation, cursor);
    case "arrow":
      return freehandIntersects(annotation, cursor);
    case "text":
      return freehandIntersects(annotation, cursor);
    default:
      return false;
  }
}

describe("distanceBetween", () => {
  it("returns zero for the same point", () => {
    expect(distanceBetween({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it("returns 5 for a 3-4-5 triangle", () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("is symmetric", () => {
    const a = { x: 10, y: 20 };
    const b = { x: 30, y: 50 };
    expect(distanceBetween(a, b)).toBe(distanceBetween(b, a));
  });

  it("handles negative coordinates", () => {
    expect(distanceBetween({ x: -3, y: 0 }, { x: 0, y: 4 })).toBe(5);
  });
});

describe("freehandIntersects", () => {
  it("returns true when cursor is directly on a point", () => {
    const annotation: TestAnnotation = {
      type: "freehand",
      points: [{ x: 100, y: 100 }],
    };
    expect(freehandIntersects(annotation, { x: 100, y: 100 })).toBe(true);
  });

  it("returns true when cursor is within ERASER_RADIUS of a point", () => {
    const annotation: TestAnnotation = {
      type: "freehand",
      points: [{ x: 100, y: 100 }],
    };
    expect(freehandIntersects(annotation, { x: 110, y: 100 })).toBe(true);
  });

  it("returns false when cursor is outside ERASER_RADIUS", () => {
    const annotation: TestAnnotation = {
      type: "freehand",
      points: [{ x: 100, y: 100 }],
    };
    expect(freehandIntersects(annotation, { x: 200, y: 200 })).toBe(false);
  });

  it("returns true if any point in a multi-point path is within range", () => {
    const annotation: TestAnnotation = {
      type: "freehand",
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ],
    };
    expect(freehandIntersects(annotation, { x: 51, y: 51 })).toBe(true);
  });

  it("returns true when cursor is exactly at ERASER_RADIUS distance", () => {
    const annotation: TestAnnotation = {
      type: "freehand",
      points: [{ x: 0, y: 0 }],
    };
    expect(freehandIntersects(annotation, { x: ERASER_RADIUS, y: 0 })).toBe(
      true
    );
  });
});

describe("rectangleIntersects", () => {
  const rectangle: TestAnnotation = {
    type: "rectangle",
    points: [
      { x: 50, y: 50 },
      { x: 150, y: 150 },
    ],
  };

  it("returns true when cursor is inside the rectangle", () => {
    expect(rectangleIntersects(rectangle, { x: 100, y: 100 })).toBe(true);
  });

  it("returns false when cursor is far outside the rectangle", () => {
    expect(rectangleIntersects(rectangle, { x: 500, y: 500 })).toBe(false);
  });

  it("returns true when cursor is near the edge within ERASER_RADIUS", () => {
    expect(rectangleIntersects(rectangle, { x: 35, y: 100 })).toBe(true);
  });

  it("returns false when cursor is beyond ERASER_RADIUS from the edge", () => {
    expect(rectangleIntersects(rectangle, { x: 20, y: 100 })).toBe(false);
  });

  it("returns false when annotation has fewer than 2 points", () => {
    const single: TestAnnotation = {
      type: "rectangle",
      points: [{ x: 50, y: 50 }],
    };
    expect(rectangleIntersects(single, { x: 50, y: 50 })).toBe(false);
  });
});

describe("annotationIntersects", () => {
  it("dispatches freehand to freehandIntersects", () => {
    const annotation: TestAnnotation = {
      type: "freehand",
      points: [{ x: 10, y: 10 }],
    };
    expect(annotationIntersects(annotation, { x: 10, y: 10 })).toBe(true);
    expect(annotationIntersects(annotation, { x: 500, y: 500 })).toBe(false);
  });

  it("dispatches rectangle to rectangleIntersects", () => {
    const annotation: TestAnnotation = {
      type: "rectangle",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
    };
    expect(annotationIntersects(annotation, { x: 50, y: 50 })).toBe(true);
  });

  it("dispatches arrow to freehandIntersects", () => {
    const annotation: TestAnnotation = {
      type: "arrow",
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 80 },
      ],
    };
    expect(annotationIntersects(annotation, { x: 0, y: 0 })).toBe(true);
    expect(annotationIntersects(annotation, { x: 40, y: 40 })).toBe(false);
  });

  it("dispatches text to freehandIntersects", () => {
    const annotation: TestAnnotation = {
      type: "text",
      points: [{ x: 200, y: 200 }],
    };
    expect(annotationIntersects(annotation, { x: 205, y: 200 })).toBe(true);
  });
});

describe("edge cases", () => {
  it("cursor exactly at ERASER_RADIUS from a freehand point is included", () => {
    const annotation: TestAnnotation = {
      type: "freehand",
      points: [{ x: 0, y: 0 }],
    };
    expect(annotationIntersects(annotation, { x: 0, y: ERASER_RADIUS })).toBe(
      true
    );
  });

  it("cursor just beyond ERASER_RADIUS from a freehand point is excluded", () => {
    const annotation: TestAnnotation = {
      type: "freehand",
      points: [{ x: 0, y: 0 }],
    };
    expect(
      annotationIntersects(annotation, { x: 0, y: ERASER_RADIUS + 0.01 })
    ).toBe(false);
  });

  it("rectangle with reversed corner order still works", () => {
    const annotation: TestAnnotation = {
      type: "rectangle",
      points: [
        { x: 150, y: 150 },
        { x: 50, y: 50 },
      ],
    };
    expect(annotationIntersects(annotation, { x: 100, y: 100 })).toBe(true);
  });
});
