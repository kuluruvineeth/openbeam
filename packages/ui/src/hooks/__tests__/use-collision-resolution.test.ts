import { describe, expect, it } from "bun:test";
import type { Node } from "@xyflow/react";
import { resolveCollisions } from "../use-collision-resolution";

interface CreateNodeOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

function createNode(id: string, options: CreateNodeOptions): Node {
  const node: Node = {
    id,
    type: "default",
    position: { x: options.x, y: options.y },
    data: {},
  };
  if (options.width !== undefined || options.height !== undefined) {
    node.measured = {
      width: options.width ?? 320,
      height: options.height ?? 100,
    };
  }
  return node;
}

describe("resolveCollisions", () => {
  it("returns empty array for empty input", () => {
    expect(resolveCollisions([])).toEqual([]);
  });

  it("returns single node unchanged", () => {
    const node = createNode("a", { x: 100, y: 200 });
    const result = resolveCollisions([node]);
    expect(result).toHaveLength(1);
    expect(result[0]?.position).toEqual({ x: 100, y: 200 });
  });

  it("keeps non-overlapping nodes unchanged", () => {
    const a = createNode("a", { x: 0, y: 0 });
    const b = createNode("b", { x: 500, y: 500 });
    const result = resolveCollisions([a, b]);
    expect(result[0]?.position).toEqual({ x: 0, y: 0 });
    expect(result[1]?.position).toEqual({ x: 500, y: 500 });
  });

  it("separates two overlapping nodes with slight offset", () => {
    const a = createNode("a", { x: 0, y: 0 });
    const b = createNode("b", { x: 10, y: 5 });
    const result = resolveCollisions([a, b]);
    const posA = result[0]?.position;
    const posB = result[1]?.position;
    const dx = Math.abs(posA.x - posB.x);
    const dy = Math.abs(posA.y - posB.y);
    expect(dx + dy).toBeGreaterThan(15);
  });

  it("resolves three-way overlap with slight offsets", () => {
    const nodes = [
      createNode("a", { x: 0, y: 0 }),
      createNode("b", { x: 5, y: 3 }),
      createNode("c", { x: -3, y: 7 }),
    ];
    const result = resolveCollisions(nodes);
    expect(result).toHaveLength(3);

    const positions = result.map((n) => `${n.position.x},${n.position.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(3);
  });

  it("respects margin parameter", () => {
    const margin = 50;
    const defaultWidth = 320;
    const gap = defaultWidth + margin - 10;
    const a = createNode("a", { x: 0, y: 0 });
    const b = createNode("b", { x: gap, y: 0 });
    const resultWithMargin = resolveCollisions([a, b], { margin });
    const posA = resultWithMargin[0]?.position;
    const posB = resultWithMargin[1]?.position;
    expect(Math.abs(posA.x - posB.x)).toBeGreaterThanOrEqual(gap);
  });

  it("uses custom measured dimensions", () => {
    const a = createNode("a", { x: 0, y: 0, width: 100, height: 50 });
    const b = createNode("b", { x: 50, y: 10, width: 100, height: 50 });
    const result = resolveCollisions([a, b]);
    const posA = result[0]?.position;
    const posB = result[1]?.position;
    const distance = Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
    expect(distance).toBeGreaterThan(50);
  });

  it("partially resolves large overlap with maxIterations=1", () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      createNode(`n${i}`, { x: i * 2, y: i * 3 })
    );
    const resultFull = resolveCollisions(nodes, { maxIterations: 50 });
    const resultPartial = resolveCollisions(nodes, { maxIterations: 1 });

    const spreadFull = computeSpread(resultFull);
    const spreadPartial = computeSpread(resultPartial);
    expect(spreadPartial).toBeGreaterThan(0);
    expect(spreadPartial).toBeLessThan(spreadFull);
  });

  it("produces non-overlapping AABB after resolution", () => {
    const nodes = [
      createNode("a", { x: 10, y: 10, width: 200, height: 80 }),
      createNode("b", { x: 50, y: 30, width: 200, height: 80 }),
      createNode("c", { x: 30, y: 50, width: 200, height: 80 }),
    ];
    const margin = 20;
    const result = resolveCollisions(nodes, { margin });

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const ni = result.at(i);
        const nj = result.at(j);
        if (!(ni && nj)) {
          continue;
        }
        const wi = ni.measured?.width ?? 320;
        const hi = ni.measured?.height ?? 100;
        const wj = nj.measured?.width ?? 320;
        const hj = nj.measured?.height ?? 100;

        const overlapX =
          ni.position.x < nj.position.x + wj &&
          ni.position.x + wi > nj.position.x;
        const overlapY =
          ni.position.y < nj.position.y + hj &&
          ni.position.y + hi > nj.position.y;

        expect(overlapX && overlapY).toBe(false);
      }
    }
  });
});

function computeSpread(nodes: Node[]): number {
  if (nodes.length < 2) {
    return 0;
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    maxX = Math.max(maxX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxY = Math.max(maxY, n.position.y);
  }
  return maxX - minX + (maxY - minY);
}
