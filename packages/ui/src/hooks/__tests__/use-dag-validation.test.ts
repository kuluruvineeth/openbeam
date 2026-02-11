import { describe, expect, it } from "bun:test";
import type { Edge, Node } from "@xyflow/react";

function createNode(
  id: string,
  type = "llm",
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    type,
    position: { x: 100, y: 100 },
    data: {},
    selected: false,
    ...overrides,
  };
}

function createEdge(id: string, source: string, target: string): Edge {
  return { id, source, target, type: "data" };
}

function getOutgoersFromArrays(
  node: Node,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  return edges
    .filter((e) => e.source === node.id)
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n): n is Node => n !== undefined);
}

function isDAGValid(
  connection: { source: string; target: string },
  nodes: Node[],
  edges: Edge[]
): boolean {
  if (connection.source === connection.target) {
    return false;
  }

  const target = nodes.find((n) => n.id === connection.target);
  if (!target) {
    return false;
  }

  const hasCycle = (node: Node, visited = new Set<string>()): boolean => {
    if (visited.has(node.id)) {
      return false;
    }
    visited.add(node.id);
    for (const outgoer of getOutgoersFromArrays(node, nodes, edges)) {
      if (outgoer.id === connection.source) {
        return true;
      }
      if (hasCycle(outgoer, visited)) {
        return true;
      }
    }
    return false;
  };

  return !hasCycle(target);
}

describe("DAG validation (cycle detection)", () => {
  it("rejects self-loops", () => {
    const nodes = [createNode("A")];
    const result = isDAGValid({ source: "A", target: "A" }, nodes, []);
    expect(result).toBe(false);
  });

  it("allows valid connection in A->B chain (adding B->C)", () => {
    const nodes = [createNode("A"), createNode("B"), createNode("C")];
    const edges = [createEdge("e1", "A", "B")];
    const result = isDAGValid({ source: "B", target: "C" }, nodes, edges);
    expect(result).toBe(true);
  });

  it("detects cycle: A->B->C, adding C->A", () => {
    const nodes = [createNode("A"), createNode("B"), createNode("C")];
    const edges = [createEdge("e1", "A", "B"), createEdge("e2", "B", "C")];
    const result = isDAGValid({ source: "C", target: "A" }, nodes, edges);
    expect(result).toBe(false);
  });

  it("detects diamond cycle: A->B, A->C, B->D, C->D, adding D->A", () => {
    const nodes = [
      createNode("A"),
      createNode("B"),
      createNode("C"),
      createNode("D"),
    ];
    const edges = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "A", "C"),
      createEdge("e3", "B", "D"),
      createEdge("e4", "C", "D"),
    ];
    const result = isDAGValid({ source: "D", target: "A" }, nodes, edges);
    expect(result).toBe(false);
  });

  it("allows parallel paths: A->B and A->C", () => {
    const nodes = [createNode("A"), createNode("B"), createNode("C")];
    const edges = [createEdge("e1", "A", "B")];
    const result = isDAGValid({ source: "A", target: "C" }, nodes, edges);
    expect(result).toBe(true);
  });

  it("returns false when target node does not exist", () => {
    const nodes = [createNode("A")];
    const result = isDAGValid(
      { source: "A", target: "nonexistent" },
      nodes,
      []
    );
    expect(result).toBe(false);
  });

  it("allows connection in empty graph", () => {
    const nodes = [createNode("A"), createNode("B")];
    const result = isDAGValid({ source: "A", target: "B" }, nodes, []);
    expect(result).toBe(true);
  });

  it("detects cycle in long chain: A->B->C->D->E, adding E->A", () => {
    const nodes = [
      createNode("A"),
      createNode("B"),
      createNode("C"),
      createNode("D"),
      createNode("E"),
    ];
    const edges = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "C", "D"),
      createEdge("e4", "D", "E"),
    ];
    const result = isDAGValid({ source: "E", target: "A" }, nodes, edges);
    expect(result).toBe(false);
  });

  it("detects partial cycle in chain: A->B->C->D->E, adding E->C", () => {
    const nodes = [
      createNode("A"),
      createNode("B"),
      createNode("C"),
      createNode("D"),
      createNode("E"),
    ];
    const edges = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "C", "D"),
      createEdge("e4", "D", "E"),
    ];
    const result = isDAGValid({ source: "E", target: "C" }, nodes, edges);
    expect(result).toBe(false);
  });

  it("allows non-cycle connection to mid-chain node", () => {
    const nodes = [
      createNode("A"),
      createNode("B"),
      createNode("C"),
      createNode("D"),
    ];
    const edges = [createEdge("e1", "A", "B"), createEdge("e2", "B", "C")];
    const result = isDAGValid({ source: "D", target: "B" }, nodes, edges);
    expect(result).toBe(true);
  });
});
