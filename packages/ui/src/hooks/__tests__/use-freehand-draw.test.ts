import { describe, expect, it } from "bun:test";
import { getStroke } from "perfect-freehand";

function getSvgPathFromStroke(stroke: number[][]): string {
  if (stroke.length === 0) {
    return "";
  }
  if (stroke.length === 1) {
    const [x, y] = stroke[0] as [number, number];
    return `M ${x} ${y} L ${x} ${y}`;
  }

  const [first, ...rest] = stroke as [number[], ...number[][]];
  let path = `M ${first[0]} ${first[1]}`;

  for (let i = 0; i < rest.length - 1; i++) {
    const current = rest[i] as [number, number];
    const next = rest[i + 1] as [number, number];
    const mx = (current[0] + next[0]) / 2;
    const my = (current[1] + next[1]) / 2;
    path += ` Q ${current[0]} ${current[1]} ${mx} ${my}`;
  }

  const last = rest.at(-1) as [number, number];
  path += ` L ${last[0]} ${last[1]}`;

  return path;
}

describe("freehand stroke generation", () => {
  it("generates an SVG path from points", () => {
    const points: [number, number, number][] = [
      [0, 0, 0.5],
      [10, 10, 0.5],
      [20, 20, 0.5],
      [30, 15, 0.5],
      [40, 10, 0.5],
    ];

    const stroke = getStroke(points, {
      size: 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });

    expect(stroke.length).toBeGreaterThan(0);

    const path = getSvgPathFromStroke(stroke);
    expect(path).toStartWith("M ");
    expect(path.length).toBeGreaterThan(10);
  });

  it("returns empty string for empty input", () => {
    const stroke = getStroke([], { size: 4 });
    const path = getSvgPathFromStroke(stroke);
    expect(path).toBe("");
  });

  it("handles a single point", () => {
    const stroke = getStroke([[50, 50, 0.5]], {
      size: 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });

    const path = getSvgPathFromStroke(stroke);
    expect(path.length).toBeGreaterThan(0);
  });

  it("produces a valid path with reduced motion options", () => {
    const points: [number, number, number][] = [
      [0, 0, 0.5],
      [20, 20, 0.5],
      [40, 40, 0.5],
    ];

    const stroke = getStroke(points, {
      size: 4,
      thinning: 0,
      smoothing: 0,
      streamline: 0,
    });

    const path = getSvgPathFromStroke(stroke);
    expect(path).toStartWith("M ");
  });

  it("varies stroke width with pressure", () => {
    const lowPressure: [number, number, number][] = [
      [0, 0, 0.1],
      [10, 10, 0.1],
      [20, 20, 0.1],
    ];

    const highPressure: [number, number, number][] = [
      [0, 0, 0.9],
      [10, 10, 0.9],
      [20, 20, 0.9],
    ];

    const options = { size: 8, thinning: 0.5, smoothing: 0.5, streamline: 0.5 };
    const lowStroke = getStroke(lowPressure, options);
    const highStroke = getStroke(highPressure, options);

    expect(lowStroke.length).toBeGreaterThan(0);
    expect(highStroke.length).toBeGreaterThan(0);

    const lowPath = getSvgPathFromStroke(lowStroke);
    const highPath = getSvgPathFromStroke(highStroke);
    expect(lowPath).not.toBe(highPath);
  });
});
