import { describe, expect, it } from "bun:test";
import type { Edge, Node } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { layoutWithDagre } from "../use-auto-layout";

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

describe("layoutWithDagre", () => {
  it("returns empty nodes for empty input", () => {
    const result = layoutWithDagre([], []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("positions a single node with no edges", () => {
    const nodes = [createNode("a")];
    const result = layoutWithDagre(nodes, []);
    expect(result.nodes).toHaveLength(1);
    expect(typeof result.nodes[0]?.position.x).toBe("number");
    expect(typeof result.nodes[0]?.position.y).toBe("number");
  });

  it("positions A→B chain with non-overlapping positions in LR", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    const result = layoutWithDagre(nodes, edges, { direction: "LR" });
    const nodeA = findNode(result.nodes, "a");
    const nodeB = findNode(result.nodes, "b");
    expect(nodeA.position.x).toBeLessThan(nodeB.position.x);
  });

  it("positions A→B chain with first node having smaller y in TB", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    const result = layoutWithDagre(nodes, edges, { direction: "TB" });
    const nodeA = findNode(result.nodes, "a");
    const nodeB = findNode(result.nodes, "b");
    expect(nodeA.position.y).toBeLessThan(nodeB.position.y);
  });

  it("lays out diamond shape with 4 positioned nodes", () => {
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
    const result = layoutWithDagre(nodes, edges);
    expect(result.nodes).toHaveLength(4);

    const positions = new Set(
      result.nodes.map((n) => `${n.position.x},${n.position.y}`)
    );
    expect(positions.size).toBe(4);
  });

  it("increases distance between siblings with larger nodeSpacing", () => {
    const nodes = [createNode("a"), createNode("b"), createNode("c")];
    const edges = [createEdge("a", "b"), createEdge("a", "c")];

    const tight = layoutWithDagre(nodes, edges, { nodeSpacing: 40 });
    const wide = layoutWithDagre(nodes, edges, { nodeSpacing: 200 });

    const tightB = findNode(tight.nodes, "b");
    const tightC = findNode(tight.nodes, "c");
    const wideB = findNode(wide.nodes, "b");
    const wideC = findNode(wide.nodes, "c");

    const tightGap = Math.abs(tightB.position.y - tightC.position.y);
    const wideGap = Math.abs(wideB.position.y - wideC.position.y);
    expect(wideGap).toBeGreaterThan(tightGap);
  });

  it("increases distance between layers with larger rankSpacing", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];

    const tight = layoutWithDagre(nodes, edges, { rankSpacing: 50 });
    const wide = layoutWithDagre(nodes, edges, { rankSpacing: 300 });

    const tightA = findNode(tight.nodes, "a");
    const tightB = findNode(tight.nodes, "b");
    const wideA = findNode(wide.nodes, "a");
    const wideB = findNode(wide.nodes, "b");

    const tightDist = Math.abs(tightB.position.x - tightA.position.x);
    const wideDist = Math.abs(wideB.position.x - wideA.position.x);
    expect(wideDist).toBeGreaterThan(tightDist);
  });

  it("sets sourcePosition Right and targetPosition Left for LR", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    const result = layoutWithDagre(nodes, edges, { direction: "LR" });
    for (const node of result.nodes) {
      expect(node.sourcePosition).toBe(Position.Right);
      expect(node.targetPosition).toBe(Position.Left);
    }
  });

  it("sets sourcePosition Bottom and targetPosition Top for TB", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    const result = layoutWithDagre(nodes, edges, { direction: "TB" });
    for (const node of result.nodes) {
      expect(node.sourcePosition).toBe(Position.Bottom);
      expect(node.targetPosition).toBe(Position.Top);
    }
  });

  it("passes edges array through unchanged", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("a", "b")];
    const result = layoutWithDagre(nodes, edges);
    expect(result.edges).toBe(edges);
  });

  it("respects node measured dimensions", () => {
    const smallNodes = [createNode("a", 100, 50), createNode("b", 100, 50)];
    const largeNodes = [createNode("a", 600, 300), createNode("b", 600, 300)];
    const edges = [createEdge("a", "b")];

    const smallResult = layoutWithDagre(smallNodes, edges);
    const largeResult = layoutWithDagre(largeNodes, edges);

    const smallA = findNode(smallResult.nodes, "a");
    const smallB = findNode(smallResult.nodes, "b");
    const largeA = findNode(largeResult.nodes, "a");
    const largeB = findNode(largeResult.nodes, "b");

    const smallDist = Math.abs(smallB.position.x - smallA.position.x);
    const largeDist = Math.abs(largeB.position.x - largeA.position.x);
    expect(largeDist).toBeGreaterThan(smallDist);
  });
});
