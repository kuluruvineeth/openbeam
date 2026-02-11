import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Edge, Node } from "@xyflow/react";

type ElkChild = { id: string; x: number; y: number };
type ElkGraph = {
  id: string;
  layoutOptions: Record<string, string>;
  children: Array<{ id: string; width: number; height: number }>;
  edges: Array<{ id: string; sources: string[]; targets: string[] }>;
};

let lastGraph: ElkGraph | null = null;
let mockLayoutFn: (graph: ElkGraph) => Promise<{ children: ElkChild[] }>;

function defaultMockLayout(graph: ElkGraph) {
  lastGraph = graph;
  const children = graph.children;
  const edgeMap = new Map<string, string[]>();
  for (const e of graph.edges) {
    const src = e.sources[0] ?? "";
    if (!edgeMap.has(src)) {
      edgeMap.set(src, []);
    }
    edgeMap.get(src)?.push(e.targets[0] ?? "");
  }

  const positions = new Map<string, { x: number; y: number }>();
  const direction = graph.layoutOptions["elk.direction"] ?? "RIGHT";
  const layerSpacing = Number.parseInt(
    graph.layoutOptions["elk.layered.spacing.nodeNodeBetweenLayers"] ?? "100",
    10
  );
  const nodeSpacing = Number.parseInt(
    graph.layoutOptions["elk.spacing.nodeNode"] ?? "80",
    10
  );

  const visited = new Set<string>();
  const queue: Array<{ id: string; layer: number; index: number }> = [];

  const roots = children.filter(
    (c) => !graph.edges.some((e) => e.targets.includes(c.id))
  );

  for (const [i, root] of roots.entries()) {
    queue.push({ id: root.id, layer: 0, index: i });
  }

  const layerCounts = new Map<number, number>();

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item || visited.has(item.id)) {
      continue;
    }
    visited.add(item.id);

    const count = layerCounts.get(item.layer) ?? 0;
    layerCounts.set(item.layer, count + 1);

    const child = children.find((c) => c.id === item.id);
    const w = child?.width ?? 320;
    const h = child?.height ?? 100;

    if (direction === "DOWN") {
      positions.set(item.id, {
        x: count * (w + nodeSpacing),
        y: item.layer * (h + layerSpacing),
      });
    } else {
      positions.set(item.id, {
        x: item.layer * (w + layerSpacing),
        y: count * (h + nodeSpacing),
      });
    }

    const targets = edgeMap.get(item.id) ?? [];
    for (const [ti, target] of targets.entries()) {
      queue.push({ id: target, layer: item.layer + 1, index: ti });
    }
  }

  for (const c of children) {
    if (!positions.has(c.id)) {
      positions.set(c.id, { x: 0, y: 0 });
    }
  }

  return Promise.resolve({
    children: children.map((c) => ({
      id: c.id,
      x: positions.get(c.id)?.x ?? 0,
      y: positions.get(c.id)?.y ?? 0,
    })),
  });
}

mock.module("elkjs/lib/elk.bundled.js", () => ({
  default: class MockELK {
    layout(graph: ElkGraph) {
      return mockLayoutFn(graph);
    }
  },
}));

const { layoutWithELK } = await import("../use-elk-layout");

function createNode(id: string, width?: number, height?: number): Node {
  const node: Node = {
    id,
    type: "default",
    position: { x: 0, y: 0 },
    data: {},
  };
  if (width !== undefined || height !== undefined) {
    node.measured = { width: width ?? 320, height: height ?? 100 };
  }
  return node;
}

function createEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

function findNode(nodes: Node[], id: string): Node {
  const node = nodes.find((n) => n.id === id);
  if (!node) {
    throw new Error(`Node ${id} not found`);
  }
  return node;
}

function uniquePositionCount(nodes: Node[]): number {
  const set = new Set(nodes.map((n) => `${n.position.x},${n.position.y}`));
  return set.size;
}

beforeEach(() => {
  lastGraph = null;
  mockLayoutFn = defaultMockLayout;
});

describe("layoutWithELK", () => {
  it("returns empty arrays for empty input", async () => {
    const result = await layoutWithELK([], []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("assigns numeric position to a single node", async () => {
    const result = await layoutWithELK([createNode("a")], []);
    expect(result.nodes).toHaveLength(1);
    expect(typeof result.nodes[0]?.position.x).toBe("number");
    expect(typeof result.nodes[0]?.position.y).toBe("number");
  });

  it("places source before target in RIGHT direction", async () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    const result = await layoutWithELK(nodes, edges, { direction: "RIGHT" });
    const a = findNode(result.nodes, "a");
    const b = findNode(result.nodes, "b");
    expect(a.position.x).toBeLessThan(b.position.x);
  });

  it("places source above target in DOWN direction", async () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    const result = await layoutWithELK(nodes, edges, { direction: "DOWN" });
    const a = findNode(result.nodes, "a");
    const b = findNode(result.nodes, "b");
    expect(a.position.y).toBeLessThan(b.position.y);
  });

  it("assigns unique positions to diamond shape", async () => {
    const nodes = [
      createNode("a"),
      createNode("b"),
      createNode("c"),
      createNode("d"),
    ];
    const edges = [
      createEdge("a", "b"),
      createEdge("a", "c"),
      createEdge("b", "d"),
      createEdge("c", "d"),
    ];
    const result = await layoutWithELK(nodes, edges);
    expect(uniquePositionCount(result.nodes)).toBe(4);
  });

  it("passes edges through unchanged", async () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    const result = await layoutWithELK(nodes, edges);
    expect(result.edges).toBe(edges);
  });

  it("preserves node type and data", async () => {
    const node: Node = {
      id: "x",
      type: "custom",
      position: { x: 0, y: 0 },
      data: { label: "test" },
    };
    const result = await layoutWithELK([node], []);
    const x = findNode(result.nodes, "x");
    expect(x.type).toBe("custom");
    expect(x.data).toEqual({ label: "test" });
  });

  it("passes correct graph structure to ELK engine", async () => {
    const nodes = [createNode("a", 200, 80), createNode("b")];
    const edges = [createEdge("a", "b")];
    await layoutWithELK(nodes, edges, {
      algorithm: "stress",
      direction: "DOWN",
    });

    expect(lastGraph).not.toBeNull();
    expect(lastGraph?.layoutOptions["elk.algorithm"]).toBe("stress");
    expect(lastGraph?.layoutOptions["elk.direction"]).toBe("DOWN");
    expect(lastGraph?.children).toHaveLength(2);
    expect(lastGraph?.children[0]?.width).toBe(200);
    expect(lastGraph?.children[0]?.height).toBe(80);
    expect(lastGraph?.children[1]?.width).toBe(320);
    expect(lastGraph?.children[1]?.height).toBe(100);
  });

  it("uses default 320x100 when measured is absent", async () => {
    await layoutWithELK([createNode("a")], []);
    expect(lastGraph?.children[0]?.width).toBe(320);
    expect(lastGraph?.children[0]?.height).toBe(100);
  });

  it("applies custom spacing via layoutOptions", async () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    await layoutWithELK(nodes, edges, {
      nodeSpacing: "200",
      layerSpacing: "300",
    });

    expect(lastGraph?.layoutOptions["elk.spacing.nodeNode"]).toBe("200");
    expect(
      lastGraph?.layoutOptions["elk.layered.spacing.nodeNodeBetweenLayers"]
    ).toBe("300");
  });

  it("wider spacing produces larger gaps", async () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];

    const tight = await layoutWithELK(nodes, edges, { layerSpacing: "50" });
    const wide = await layoutWithELK(nodes, edges, { layerSpacing: "500" });

    const tightA = findNode(tight.nodes, "a");
    const tightB = findNode(tight.nodes, "b");
    const wideA = findNode(wide.nodes, "a");
    const wideB = findNode(wide.nodes, "b");

    const tightGap = Math.abs(tightB.position.x - tightA.position.x);
    const wideGap = Math.abs(wideB.position.x - wideA.position.x);
    expect(wideGap).toBeGreaterThan(tightGap);
  });

  it("handles chain of 5 nodes preserving count", async () => {
    const nodes = Array.from({ length: 5 }, (_, i) => createNode(`n${i}`));
    const edges = Array.from({ length: 4 }, (_, i) =>
      createEdge(`n${i}`, `n${i + 1}`)
    );
    const result = await layoutWithELK(nodes, edges);
    expect(result.nodes).toHaveLength(5);
    expect(result.edges).toHaveLength(4);
  });

  it("maintains order in 3-node chain RIGHT", async () => {
    const nodes = [createNode("a"), createNode("b"), createNode("c")];
    const edges = [createEdge("a", "b"), createEdge("b", "c")];
    const result = await layoutWithELK(nodes, edges, { direction: "RIGHT" });
    const a = findNode(result.nodes, "a");
    const b = findNode(result.nodes, "b");
    const c = findNode(result.nodes, "c");
    expect(a.position.x).toBeLessThan(b.position.x);
    expect(b.position.x).toBeLessThan(c.position.x);
  });

  it("disconnected components get positioned", async () => {
    const nodes = [
      createNode("a"),
      createNode("b"),
      createNode("c"),
      createNode("d"),
    ];
    const edges = [createEdge("a", "b"), createEdge("c", "d")];
    const result = await layoutWithELK(nodes, edges);
    expect(uniquePositionCount(result.nodes)).toBe(4);
  });

  it("defaults to layered algorithm and RIGHT direction", async () => {
    await layoutWithELK([createNode("a")], []);
    expect(lastGraph?.layoutOptions["elk.algorithm"]).toBe("layered");
    expect(lastGraph?.layoutOptions["elk.direction"]).toBe("RIGHT");
  });
});
