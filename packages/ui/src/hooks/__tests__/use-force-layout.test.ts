import { describe, expect, it } from "bun:test";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";

interface ForceNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

interface ForceLink {
  source: string;
  target: string;
}

const DEFAULT_LINK_DISTANCE = 200;
const DEFAULT_CHARGE_STRENGTH = -300;
const DEFAULT_COLLISION_RADIUS = 100;
const MAX_ITERATIONS = 300;

interface SimulationOptions {
  nodes: ForceNode[];
  links: ForceLink[];
  distance?: number;
  strength?: number;
  collisionRadius?: number;
  iterations?: number;
}

function runForceSimulation(options: SimulationOptions): ForceNode[] {
  const nodes = options.nodes.map((n) => ({ ...n }));

  const sim = forceSimulation<ForceNode>(nodes)
    .force(
      "link",
      forceLink<ForceNode, ForceLink>(options.links)
        .id((d) => d.id)
        .distance(options.distance ?? DEFAULT_LINK_DISTANCE)
    )
    .force(
      "charge",
      forceManyBody().strength(options.strength ?? DEFAULT_CHARGE_STRENGTH)
    )
    .force(
      "collision",
      forceCollide().radius(options.collisionRadius ?? DEFAULT_COLLISION_RADIUS)
    )
    .force("center", forceCenter(0, 0));

  const maxTicks = options.iterations ?? MAX_ITERATIONS;
  for (let i = 0; i < maxTicks; i++) {
    sim.tick();
  }
  sim.stop();

  return nodes;
}

function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

describe("runForceSimulation", () => {
  it("places a single node near the center", () => {
    const result = runForceSimulation({
      nodes: [{ id: "a", x: 100, y: 100 }],
      links: [],
    });
    expect(result).toHaveLength(1);
    expect(Math.abs(result[0].x)).toBeLessThan(50);
    expect(Math.abs(result[0].y)).toBeLessThan(50);
  });

  it("keeps two connected nodes within link distance", () => {
    const result = runForceSimulation({
      nodes: [
        { id: "a", x: -200, y: 0 },
        { id: "b", x: 200, y: 0 },
      ],
      links: [{ source: "a", target: "b" }],
    });
    const dist = distanceBetween(result[0], result[1]);
    expect(dist).toBeLessThan(DEFAULT_LINK_DISTANCE * 2);
    expect(dist).toBeGreaterThan(0);
  });

  it("repels unconnected nodes apart", () => {
    const result = runForceSimulation({
      nodes: [
        { id: "a", x: 5, y: 0 },
        { id: "b", x: -5, y: 0 },
      ],
      links: [],
    });
    const dist = distanceBetween(result[0], result[1]);
    expect(dist).toBeGreaterThan(DEFAULT_COLLISION_RADIUS * 0.5);
  });

  it("avoids collision between nearby nodes", () => {
    const result = runForceSimulation({
      nodes: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 10, y: 0 },
        { id: "c", x: -10, y: 0 },
      ],
      links: [],
    });
    const distAB = distanceBetween(result[0], result[1]);
    const distAC = distanceBetween(result[0], result[2]);
    const distBC = distanceBetween(result[1], result[2]);
    expect(distAB).toBeGreaterThan(DEFAULT_COLLISION_RADIUS * 0.5);
    expect(distAC).toBeGreaterThan(DEFAULT_COLLISION_RADIUS * 0.5);
    expect(distBC).toBeGreaterThan(DEFAULT_COLLISION_RADIUS * 0.5);
  });

  it("custom distance affects layout spacing", () => {
    const shortDist = runForceSimulation({
      nodes: [
        { id: "a", x: -100, y: 0 },
        { id: "b", x: 100, y: 0 },
      ],
      links: [{ source: "a", target: "b" }],
      distance: 50,
    });
    const longDist = runForceSimulation({
      nodes: [
        { id: "a", x: -100, y: 0 },
        { id: "b", x: 100, y: 0 },
      ],
      links: [{ source: "a", target: "b" }],
      distance: 500,
    });
    const shortGap = distanceBetween(shortDist[0], shortDist[1]);
    const longGap = distanceBetween(longDist[0], longDist[1]);
    expect(longGap).toBeGreaterThan(shortGap);
  });

  it("does not mutate the original input nodes", () => {
    const original = [
      { id: "a", x: 50, y: 50 },
      { id: "b", x: -50, y: -50 },
    ];
    const originalCopy = original.map((n) => ({ ...n }));
    runForceSimulation({ nodes: original, links: [] });
    expect(original[0].x).toBe(originalCopy[0].x);
    expect(original[0].y).toBe(originalCopy[0].y);
    expect(original[1].x).toBe(originalCopy[1].x);
    expect(original[1].y).toBe(originalCopy[1].y);
  });

  it("produces finite coordinates for all nodes", () => {
    const result = runForceSimulation({
      nodes: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 1000, y: 1000 },
        { id: "c", x: -1000, y: -1000 },
      ],
      links: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    });
    for (const node of result) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it("handles a chain of three linked nodes", () => {
    const result = runForceSimulation({
      nodes: [
        { id: "a", x: -300, y: 0 },
        { id: "b", x: 0, y: 0 },
        { id: "c", x: 300, y: 0 },
      ],
      links: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    });
    const distAB = distanceBetween(result[0], result[1]);
    const distBC = distanceBetween(result[1], result[2]);
    expect(distAB).toBeGreaterThan(0);
    expect(distBC).toBeGreaterThan(0);
    expect(distAB).toBeLessThan(DEFAULT_LINK_DISTANCE * 3);
    expect(distBC).toBeLessThan(DEFAULT_LINK_DISTANCE * 3);
  });

  it("fewer iterations produce less settled layout", () => {
    const fewIterations = runForceSimulation({
      nodes: [
        { id: "a", x: 500, y: 0 },
        { id: "b", x: -500, y: 0 },
      ],
      links: [{ source: "a", target: "b" }],
      iterations: 5,
    });
    const manyIterations = runForceSimulation({
      nodes: [
        { id: "a", x: 500, y: 0 },
        { id: "b", x: -500, y: 0 },
      ],
      links: [{ source: "a", target: "b" }],
      iterations: 300,
    });
    const fewDist = distanceBetween(fewIterations[0], fewIterations[1]);
    const manyDist = distanceBetween(manyIterations[0], manyIterations[1]);
    expect(fewDist).not.toBe(manyDist);
  });
});

describe("distanceBetween", () => {
  it("returns zero for identical points", () => {
    expect(distanceBetween({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it("calculates Euclidean distance correctly", () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("is symmetric", () => {
    const a = { x: 10, y: 20 };
    const b = { x: 30, y: 40 };
    expect(distanceBetween(a, b)).toBe(distanceBetween(b, a));
  });
});

describe("force layout constants", () => {
  it("has positive default link distance", () => {
    expect(DEFAULT_LINK_DISTANCE).toBeGreaterThan(0);
  });

  it("has negative default charge strength for repulsion", () => {
    expect(DEFAULT_CHARGE_STRENGTH).toBeLessThan(0);
  });

  it("has positive collision radius", () => {
    expect(DEFAULT_COLLISION_RADIUS).toBeGreaterThan(0);
  });

  it("has reasonable max iterations", () => {
    expect(MAX_ITERATIONS).toBeGreaterThan(0);
    expect(MAX_ITERATIONS).toBeLessThanOrEqual(1000);
  });
});
