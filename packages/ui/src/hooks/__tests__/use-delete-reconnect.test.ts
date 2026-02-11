import { describe, expect, it } from "bun:test";
import type { Edge, Node } from "@xyflow/react";
import { getConnectedEdges, getIncomers, getOutgoers } from "@xyflow/react";

function createNode(id: string, overrides: Partial<Node> = {}): Node {
  return {
    id,
    type: "llm",
    position: { x: 0, y: 0 },
    data: {},
    ...overrides,
  };
}

function createEdge(id: string, source: string, target: string): Edge {
  return { id, source, target, type: "data" };
}

interface BridgeResult {
  bridgeEdges: Array<{ source: string; target: string }>;
  edgesToRemove: Set<string>;
}

function computeBridgeEdges(options: {
  deleted: Node[];
  allNodes: Node[];
  allEdges: Edge[];
}): BridgeResult {
  const bridgeEdges: Array<{ source: string; target: string }> = [];
  const edgesToRemove = new Set<string>();

  for (const deletedNode of options.deleted) {
    const connected = getConnectedEdges([deletedNode], options.allEdges);
    for (const edge of connected) {
      edgesToRemove.add(edge.id);
    }

    const incomers = getIncomers(
      deletedNode,
      options.allNodes,
      options.allEdges
    );
    const outgoers = getOutgoers(
      deletedNode,
      options.allNodes,
      options.allEdges
    );

    for (const incomer of incomers) {
      for (const outgoer of outgoers) {
        bridgeEdges.push({ source: incomer.id, target: outgoer.id });
      }
    }
  }

  return { bridgeEdges, edgesToRemove };
}

describe("computeBridgeEdges", () => {
  it("bridges incomers to outgoers when middle node is deleted", () => {
    const nodes = [createNode("a"), createNode("b"), createNode("c")];
    const edges = [createEdge("e1", "a", "b"), createEdge("e2", "b", "c")];

    const result = computeBridgeEdges({
      deleted: [nodes[1] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.bridgeEdges).toHaveLength(1);
    expect(result.bridgeEdges[0]).toEqual({ source: "a", target: "c" });
  });

  it("marks connected edges for removal", () => {
    const nodes = [createNode("a"), createNode("b"), createNode("c")];
    const edges = [createEdge("e1", "a", "b"), createEdge("e2", "b", "c")];

    const result = computeBridgeEdges({
      deleted: [nodes[1] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.edgesToRemove.has("e1")).toBe(true);
    expect(result.edgesToRemove.has("e2")).toBe(true);
    expect(result.edgesToRemove.size).toBe(2);
  });

  it("returns empty results when deleting a leaf node with no outgoers", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("e1", "a", "b")];

    const result = computeBridgeEdges({
      deleted: [nodes[1] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.bridgeEdges).toHaveLength(0);
    expect(result.edgesToRemove.has("e1")).toBe(true);
  });

  it("returns empty results when deleting a root node with no incomers", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("e1", "a", "b")];

    const result = computeBridgeEdges({
      deleted: [nodes[0] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.bridgeEdges).toHaveLength(0);
    expect(result.edgesToRemove.has("e1")).toBe(true);
  });

  it("handles fan-in by bridging multiple incomers to single outgoer", () => {
    const nodes = [
      createNode("a"),
      createNode("b"),
      createNode("c"),
      createNode("d"),
    ];
    const edges = [
      createEdge("e1", "a", "c"),
      createEdge("e2", "b", "c"),
      createEdge("e3", "c", "d"),
    ];

    const result = computeBridgeEdges({
      deleted: [nodes[2] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.bridgeEdges).toHaveLength(2);
    expect(result.bridgeEdges).toContainEqual({ source: "a", target: "d" });
    expect(result.bridgeEdges).toContainEqual({ source: "b", target: "d" });
  });

  it("handles fan-out by bridging single incomer to multiple outgoers", () => {
    const nodes = [
      createNode("a"),
      createNode("b"),
      createNode("c"),
      createNode("d"),
    ];
    const edges = [
      createEdge("e1", "a", "b"),
      createEdge("e2", "b", "c"),
      createEdge("e3", "b", "d"),
    ];

    const result = computeBridgeEdges({
      deleted: [nodes[1] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.bridgeEdges).toHaveLength(2);
    expect(result.bridgeEdges).toContainEqual({ source: "a", target: "c" });
    expect(result.bridgeEdges).toContainEqual({ source: "a", target: "d" });
  });

  it("creates cartesian product bridges for diamond topology", () => {
    const nodes = [
      createNode("a"),
      createNode("b"),
      createNode("c"),
      createNode("d"),
      createNode("e"),
    ];
    const edges = [
      createEdge("e1", "a", "c"),
      createEdge("e2", "b", "c"),
      createEdge("e3", "c", "d"),
      createEdge("e4", "c", "e"),
    ];

    const result = computeBridgeEdges({
      deleted: [nodes[2] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.bridgeEdges).toHaveLength(4);
    expect(result.bridgeEdges).toContainEqual({ source: "a", target: "d" });
    expect(result.bridgeEdges).toContainEqual({ source: "a", target: "e" });
    expect(result.bridgeEdges).toContainEqual({ source: "b", target: "d" });
    expect(result.bridgeEdges).toContainEqual({ source: "b", target: "e" });
  });

  it("handles deleting an isolated node with no edges", () => {
    const nodes = [createNode("a"), createNode("b"), createNode("c")];
    const edges = [createEdge("e1", "a", "c")];

    const result = computeBridgeEdges({
      deleted: [nodes[1] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.bridgeEdges).toHaveLength(0);
    expect(result.edgesToRemove.size).toBe(0);
  });

  it("handles deleting multiple nodes in a chain", () => {
    const nodes = [
      createNode("a"),
      createNode("b"),
      createNode("c"),
      createNode("d"),
    ];
    const edges = [
      createEdge("e1", "a", "b"),
      createEdge("e2", "b", "c"),
      createEdge("e3", "c", "d"),
    ];

    const result = computeBridgeEdges({
      deleted: [nodes[1] as Node, nodes[2] as Node],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.edgesToRemove.has("e1")).toBe(true);
    expect(result.edgesToRemove.has("e2")).toBe(true);
    expect(result.edgesToRemove.has("e3")).toBe(true);

    expect(result.bridgeEdges).toContainEqual({ source: "a", target: "c" });
    expect(result.bridgeEdges).toContainEqual({ source: "b", target: "d" });
  });

  it("returns empty results when no nodes are deleted", () => {
    const nodes = [createNode("a"), createNode("b")];
    const edges = [createEdge("e1", "a", "b")];

    const result = computeBridgeEdges({
      deleted: [],
      allNodes: nodes,
      allEdges: edges,
    });

    expect(result.bridgeEdges).toHaveLength(0);
    expect(result.edgesToRemove.size).toBe(0);
  });
});
