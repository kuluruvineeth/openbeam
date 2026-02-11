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

const SOURCE_ONLY_TYPES = new Set<string>([
  "start",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
]);

const SINK_ONLY_TYPES = new Set<string>(["end"]);

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

function isConnectionValid(
  connection: { source: string; target: string },
  nodes: Node[],
  edges: Edge[]
): boolean {
  if (!isDAGValid(connection, nodes, edges)) {
    return false;
  }

  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!(sourceNode && targetNode)) {
    return false;
  }

  if (SINK_ONLY_TYPES.has(sourceNode.type ?? "")) {
    return false;
  }
  if (SOURCE_ONLY_TYPES.has(targetNode.type ?? "")) {
    return false;
  }

  return true;
}

describe("connection validation (type constraints)", () => {
  it("rejects connection FROM an end node", () => {
    const nodes = [createNode("e1", "end"), createNode("a1", "llm")];
    const result = isConnectionValid({ source: "e1", target: "a1" }, nodes, []);
    expect(result).toBe(false);
  });

  it("rejects connection TO a start node", () => {
    const nodes = [createNode("a1", "llm"), createNode("s1", "start")];
    const result = isConnectionValid({ source: "a1", target: "s1" }, nodes, []);
    expect(result).toBe(false);
  });

  it("rejects connection TO trigger_manual", () => {
    const nodes = [createNode("a1", "llm"), createNode("t1", "trigger_manual")];
    const result = isConnectionValid({ source: "a1", target: "t1" }, nodes, []);
    expect(result).toBe(false);
  });

  it("rejects connection TO trigger_schedule", () => {
    const nodes = [
      createNode("a1", "llm"),
      createNode("t1", "trigger_schedule"),
    ];
    const result = isConnectionValid({ source: "a1", target: "t1" }, nodes, []);
    expect(result).toBe(false);
  });

  it("rejects connection TO trigger_webhook", () => {
    const nodes = [
      createNode("a1", "llm"),
      createNode("t1", "trigger_webhook"),
    ];
    const result = isConnectionValid({ source: "a1", target: "t1" }, nodes, []);
    expect(result).toBe(false);
  });

  it("rejects connection TO trigger_event", () => {
    const nodes = [createNode("a1", "llm"), createNode("t1", "trigger_event")];
    const result = isConnectionValid({ source: "a1", target: "t1" }, nodes, []);
    expect(result).toBe(false);
  });

  it("allows llm -> code connection", () => {
    const nodes = [createNode("a1", "llm"), createNode("a2", "code")];
    const result = isConnectionValid({ source: "a1", target: "a2" }, nodes, []);
    expect(result).toBe(true);
  });

  it("allows trigger_manual -> llm (triggers CAN be sources)", () => {
    const nodes = [createNode("t1", "trigger_manual"), createNode("a1", "llm")];
    const result = isConnectionValid({ source: "t1", target: "a1" }, nodes, []);
    expect(result).toBe(true);
  });

  it("rejects when cycle would form", () => {
    const nodes = [createNode("A", "llm"), createNode("B", "code")];
    const edges = [createEdge("e1", "A", "B")];
    const result = isConnectionValid(
      { source: "B", target: "A" },
      nodes,
      edges
    );
    expect(result).toBe(false);
  });

  it("rejects when source node not found", () => {
    const nodes = [createNode("a1", "llm")];
    const result = isConnectionValid(
      { source: "missing", target: "a1" },
      nodes,
      []
    );
    expect(result).toBe(false);
  });

  it("rejects when target node not found", () => {
    const nodes = [createNode("a1", "llm")];
    const result = isConnectionValid(
      { source: "a1", target: "missing" },
      nodes,
      []
    );
    expect(result).toBe(false);
  });
});
