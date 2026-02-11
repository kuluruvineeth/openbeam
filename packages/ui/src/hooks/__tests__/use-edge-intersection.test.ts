import { describe, expect, it } from "bun:test";
import type { Edge } from "@xyflow/react";

function insertNodeOnEdge(
  edges: Edge[],
  nodeId: string,
  edgeId: string
): Edge[] | null {
  const edge = edges.find((e) => e.id === edgeId);
  if (!edge) {
    return null;
  }

  const newSourceEdge: Edge = {
    id: `${edge.source}-${nodeId}`,
    source: edge.source,
    target: nodeId,
    sourceHandle: edge.sourceHandle,
    type: edge.type,
  };

  const newTargetEdge: Edge = {
    id: `${nodeId}-${edge.target}`,
    source: nodeId,
    target: edge.target,
    targetHandle: edge.targetHandle,
    type: edge.type,
  };

  return edges
    .filter((e) => e.id !== edgeId)
    .concat(newSourceEdge, newTargetEdge);
}

function edgeById(edges: Edge[], id: string): Edge {
  const found = edges.find((e) => e.id === id);
  if (!found) {
    throw new Error(`Edge "${id}" not found`);
  }
  return found;
}

function makeEdge(
  overrides: Partial<Edge> & { id: string; source: string; target: string }
): Edge {
  return { ...overrides };
}

describe("insertNodeOnEdge", () => {
  it("splits a simple A->B edge into A->C and C->B", () => {
    const edges: Edge[] = [makeEdge({ id: "a-b", source: "a", target: "b" })];
    const result = insertNodeOnEdge(edges, "c", "a-b");

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);

    const sourceEdge = edgeById(result as Edge[], "a-c");
    expect(sourceEdge.source).toBe("a");
    expect(sourceEdge.target).toBe("c");

    const targetEdge = edgeById(result as Edge[], "c-b");
    expect(targetEdge.source).toBe("c");
    expect(targetEdge.target).toBe("b");
  });

  it("produces edge count = original + 1 (removed 1, added 2)", () => {
    const edges: Edge[] = [
      makeEdge({ id: "a-b", source: "a", target: "b" }),
      makeEdge({ id: "b-c", source: "b", target: "c" }),
      makeEdge({ id: "c-d", source: "c", target: "d" }),
    ];
    const result = insertNodeOnEdge(edges, "x", "b-c");

    expect(result).toHaveLength(4);
  });

  it("preserves type from the original edge", () => {
    const edges: Edge[] = [
      makeEdge({ id: "a-b", source: "a", target: "b", type: "smoothstep" }),
    ];
    const result = insertNodeOnEdge(edges, "c", "a-b") as Edge[];

    expect(edgeById(result, "a-c").type).toBe("smoothstep");
    expect(edgeById(result, "c-b").type).toBe("smoothstep");
  });

  it("returns null when edge is not found", () => {
    const edges: Edge[] = [makeEdge({ id: "a-b", source: "a", target: "b" })];
    const result = insertNodeOnEdge(edges, "c", "nonexistent");

    expect(result).toBeNull();
  });

  it("preserves sourceHandle on the first new edge and targetHandle on the second", () => {
    const edges: Edge[] = [
      makeEdge({
        id: "a-b",
        source: "a",
        target: "b",
        sourceHandle: "out-1",
        targetHandle: "in-2",
      }),
    ];
    const result = insertNodeOnEdge(edges, "c", "a-b") as Edge[];

    expect(edgeById(result, "a-c").sourceHandle).toBe("out-1");
    expect(edgeById(result, "c-b").targetHandle).toBe("in-2");
  });

  it("only replaces the target edge, leaving others untouched", () => {
    const edges: Edge[] = [
      makeEdge({ id: "x-y", source: "x", target: "y", type: "default" }),
      makeEdge({ id: "a-b", source: "a", target: "b", type: "smoothstep" }),
      makeEdge({ id: "m-n", source: "m", target: "n", type: "straight" }),
    ];
    const result = insertNodeOnEdge(edges, "c", "a-b") as Edge[];

    expect(result).toHaveLength(4);

    const untouched1 = edgeById(result, "x-y");
    expect(untouched1.source).toBe("x");
    expect(untouched1.target).toBe("y");
    expect(untouched1.type).toBe("default");

    const untouched2 = edgeById(result, "m-n");
    expect(untouched2.source).toBe("m");
    expect(untouched2.target).toBe("n");
    expect(untouched2.type).toBe("straight");
  });

  it("supports chain insertion: insert C on A->B, then D on A->C", () => {
    const initial: Edge[] = [makeEdge({ id: "a-b", source: "a", target: "b" })];

    const afterFirst = insertNodeOnEdge(initial, "c", "a-b") as Edge[];
    expect(afterFirst).toHaveLength(2);

    const afterSecond = insertNodeOnEdge(afterFirst, "d", "a-c") as Edge[];
    expect(afterSecond).toHaveLength(3);

    const ad = edgeById(afterSecond, "a-d");
    expect(ad.source).toBe("a");
    expect(ad.target).toBe("d");

    const dc = edgeById(afterSecond, "d-c");
    expect(dc.source).toBe("d");
    expect(dc.target).toBe("c");

    const cb = edgeById(afterSecond, "c-b");
    expect(cb.source).toBe("c");
    expect(cb.target).toBe("b");
  });

  it("generates edge IDs following source-target pattern", () => {
    const edges: Edge[] = [
      makeEdge({ id: "node1-node2", source: "node1", target: "node2" }),
    ];
    const result = insertNodeOnEdge(edges, "inserted", "node1-node2") as Edge[];

    const ids = result.map((e) => e.id).sort();
    expect(ids).toEqual(["inserted-node2", "node1-inserted"]);
  });

  it("handles undefined type (property exists but value is undefined)", () => {
    const edges: Edge[] = [
      makeEdge({ id: "a-b", source: "a", target: "b", type: undefined }),
    ];
    const result = insertNodeOnEdge(edges, "c", "a-b") as Edge[];

    expect(result).toHaveLength(2);
    expect(edgeById(result, "a-c").type).toBeUndefined();
    expect(edgeById(result, "c-b").type).toBeUndefined();
  });

  it("returns null for an empty edges array", () => {
    const result = insertNodeOnEdge([], "c", "a-b");
    expect(result).toBeNull();
  });

  it("does not mutate the original edges array", () => {
    const edges: Edge[] = [
      makeEdge({ id: "a-b", source: "a", target: "b" }),
      makeEdge({ id: "b-c", source: "b", target: "c" }),
    ];
    const original = [...edges];
    insertNodeOnEdge(edges, "x", "a-b");

    expect(edges).toHaveLength(original.length);
    expect(edges.map((e) => e.id)).toEqual(original.map((e) => e.id));
  });

  it("does not carry sourceHandle to the second edge or targetHandle to the first", () => {
    const edges: Edge[] = [
      makeEdge({
        id: "a-b",
        source: "a",
        target: "b",
        sourceHandle: "out-1",
        targetHandle: "in-2",
      }),
    ];
    const result = insertNodeOnEdge(edges, "c", "a-b") as Edge[];

    expect(edgeById(result, "a-c").targetHandle).toBeUndefined();
    expect(edgeById(result, "c-b").sourceHandle).toBeUndefined();
  });
});
