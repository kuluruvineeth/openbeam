import type { ExecutionPlan, ExecutionPlanNode } from "@openbeam/types/canvas";
import { describe, expect, it } from "vitest";
import {
  buildEdgeByHandleMap,
  extractBranchId,
  filterEdgesBySourceHandle,
  filterEdgesByTargetHandle,
  findEdgeBySourceHandle,
  findEdgeByTargetHandle,
  getEdgeSource,
  getEdgeTarget,
  resolveEdgesForHandle,
  resolveNextEdge,
  resolveTryCatchEdges,
  validateTryCatchEdges,
  validateUniqueEdgeHandles,
} from "../utils/edges";

function createNode(
  id: string,
  type: ExecutionPlanNode["type"]
): ExecutionPlanNode {
  return {
    id,
    type,
    data: {},
    inbound: [],
    outbound: [],
  };
}

function createEdge(
  id: string,
  source: string,
  target: string,
  options: {
    sourceHandle?: string;
    targetHandle?: string;
  } = {}
): ExecutionPlan["edges"][number] {
  return {
    id,
    source,
    target,
    type: "data",
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
  };
}

function buildEdgesBySource(
  edges: ExecutionPlan["edges"]
): Map<string, ExecutionPlan["edges"]> {
  const map = new Map<string, ExecutionPlan["edges"]>();
  for (const edge of edges) {
    const list = map.get(edge.source) ?? [];
    list.push(edge);
    map.set(edge.source, list);
  }
  return map;
}

describe("extractBranchId", () => {
  it("extracts string output as branch ID", () => {
    expect(extractBranchId("approved")).toBe("approved");
  });

  it("extracts branchId from object", () => {
    expect(extractBranchId({ branchId: "rejected" })).toBe("rejected");
  });

  it("returns null for non-string, non-object", () => {
    expect(extractBranchId(123)).toBeNull();
    expect(extractBranchId(null)).toBeNull();
    expect(extractBranchId(undefined)).toBeNull();
  });

  it("returns null for object without branchId", () => {
    expect(extractBranchId({ value: "test" })).toBeNull();
  });

  it("returns null for object with non-string branchId", () => {
    expect(extractBranchId({ branchId: 123 })).toBeNull();
  });
});

describe("filterEdgesBySourceHandle", () => {
  it("filters edges by source handle", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B", { sourceHandle: "true" }),
      createEdge("e2", "A", "C", { sourceHandle: "false" }),
    ];

    const result = filterEdgesBySourceHandle(edges, "true");

    expect(result).toHaveLength(1);
    expect(result[0]?.target).toBe("B");
  });

  it("returns empty array when no match", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B", { sourceHandle: "true" }),
    ];

    const result = filterEdgesBySourceHandle(edges, "false");

    expect(result).toHaveLength(0);
  });
});

describe("filterEdgesByTargetHandle", () => {
  it("filters edges by target handle", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "C", { targetHandle: "input-1" }),
      createEdge("e2", "B", "C", { targetHandle: "input-2" }),
    ];

    const result = filterEdgesByTargetHandle(edges, "input-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("A");
  });
});

describe("findEdgeBySourceHandle", () => {
  it("finds first edge with matching source handle", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B", { sourceHandle: "try" }),
      createEdge("e2", "A", "C", { sourceHandle: "catch" }),
    ];

    const result = findEdgeBySourceHandle(edges, "catch");

    expect(result?.target).toBe("C");
  });

  it("returns undefined when not found", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B", { sourceHandle: "try" }),
    ];

    const result = findEdgeBySourceHandle(edges, "catch");

    expect(result).toBeUndefined();
  });
});

describe("findEdgeByTargetHandle", () => {
  it("finds first edge with matching target handle", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "C", { targetHandle: "input-1" }),
      createEdge("e2", "B", "C", { targetHandle: "input-2" }),
    ];

    const result = findEdgeByTargetHandle(edges, "input-2");

    expect(result?.source).toBe("B");
  });
});

describe("getEdgeTarget / getEdgeSource", () => {
  it("returns target from edge", () => {
    const edge = createEdge("e1", "A", "B");

    expect(getEdgeTarget(edge)).toBe("B");
  });

  it("returns source from edge", () => {
    const edge = createEdge("e1", "A", "B");

    expect(getEdgeSource(edge)).toBe("A");
  });

  it("returns null for undefined edge", () => {
    expect(getEdgeTarget(undefined)).toBeNull();
    expect(getEdgeSource(undefined)).toBeNull();
  });
});

describe("buildEdgeByHandleMap", () => {
  it("builds map using source handles", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B", { sourceHandle: "branch-1" }),
      createEdge("e2", "A", "C", { sourceHandle: "branch-2" }),
    ];

    const result = buildEdgeByHandleMap(edges, true);

    expect(result.size).toBe(2);
    expect(result.get("branch-1")?.target).toBe("B");
    expect(result.get("branch-2")?.target).toBe("C");
  });

  it("builds map using target handles", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "C", { targetHandle: "input-1" }),
      createEdge("e2", "B", "C", { targetHandle: "input-2" }),
    ];

    const result = buildEdgeByHandleMap(edges, false);

    expect(result.size).toBe(2);
    expect(result.get("input-1")?.source).toBe("A");
    expect(result.get("input-2")?.source).toBe("B");
  });

  it("skips edges without handles", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "A", "C", { sourceHandle: "branch-1" }),
    ];

    const result = buildEdgeByHandleMap(edges, true);

    expect(result.size).toBe(1);
  });
});

describe("resolveNextEdge", () => {
  it("returns null for end node", () => {
    const node = createNode("end", "end");
    const edgesBySource = new Map<string, ExecutionPlan["edges"]>();

    const result = resolveNextEdge({ node, edgesBySource, branchId: null });

    expect(result.nextNodeId).toBeNull();
    expect(result.edge).toBeUndefined();
  });

  it("throws for node with no outbound edges", () => {
    const node = createNode("transform", "transform");
    const edgesBySource = new Map<string, ExecutionPlan["edges"]>();

    expect(() =>
      resolveNextEdge({ node, edgesBySource, branchId: null })
    ).toThrow();
  });

  it("returns next node for simple edge", () => {
    const node = createNode("transform", "transform");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "transform", "next"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = resolveNextEdge({ node, edgesBySource, branchId: null });

    expect(result.nextNodeId).toBe("next");
    expect(result.edge?.id).toBe("e1");
  });

  it("resolves condition branch by ID", () => {
    const node = createNode("cond", "condition");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "cond", "yes", { sourceHandle: "true" }),
      createEdge("e2", "cond", "no", { sourceHandle: "false" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = resolveNextEdge({
      node,
      edgesBySource,
      branchId: "true",
    });

    expect(result.nextNodeId).toBe("yes");
  });

  it("resolves condition to default when branch not found", () => {
    const node = createNode("cond", "condition");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "cond", "yes", { sourceHandle: "true" }),
      createEdge("e2", "cond", "fallback", { sourceHandle: "default" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = resolveNextEdge({
      node,
      edgesBySource,
      branchId: "unknown",
    });

    expect(result.nextNodeId).toBe("fallback");
  });

  it("throws when approval node has no branch", () => {
    const node = createNode("approval", "approval");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "approval", "approved", { sourceHandle: "approved" }),
      createEdge("e2", "approval", "rejected", { sourceHandle: "rejected" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    expect(() =>
      resolveNextEdge({ node, edgesBySource, branchId: null })
    ).toThrow();
  });

  it("resolves approval branch", () => {
    const node = createNode("approval", "approval");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "approval", "approved", { sourceHandle: "approved" }),
      createEdge("e2", "approval", "rejected", { sourceHandle: "rejected" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = resolveNextEdge({
      node,
      edgesBySource,
      branchId: "approved",
    });

    expect(result.nextNodeId).toBe("approved");
  });

  it("throws when loop node has no branch", () => {
    const node = createNode("loop", "loop");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "loop", "body", { sourceHandle: "body" }),
      createEdge("e2", "loop", "done", { sourceHandle: "done" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    expect(() =>
      resolveNextEdge({ node, edgesBySource, branchId: null })
    ).toThrow();
  });

  it("resolves loop body branch", () => {
    const node = createNode("loop", "loop");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "loop", "body", { sourceHandle: "body" }),
      createEdge("e2", "loop", "done", { sourceHandle: "done" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = resolveNextEdge({
      node,
      edgesBySource,
      branchId: "body",
    });

    expect(result.nextNodeId).toBe("body");
  });

  it("resolves input node branch when allowSkip", () => {
    const node = createNode("input", "input");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "input", "data", { sourceHandle: "data" }),
      createEdge("e2", "input", "skipped", { sourceHandle: "skipped" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = resolveNextEdge({
      node,
      edgesBySource,
      branchId: "skipped",
    });

    expect(result.nextNodeId).toBe("skipped");
  });

  it("throws for invalid outbound count", () => {
    const node = createNode("transform", "transform");
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "transform", "a"),
      createEdge("e2", "transform", "b"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    expect(() =>
      resolveNextEdge({ node, edgesBySource, branchId: null })
    ).toThrow();
  });
});

describe("resolveEdgesForHandle", () => {
  it("returns edges matching handle", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "split", "a", { sourceHandle: "branch-a" }),
      createEdge("e2", "split", "b", { sourceHandle: "branch-b" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = resolveEdgesForHandle("split", "branch-a", edgesBySource);

    expect(result).toHaveLength(1);
    expect(result[0]?.target).toBe("a");
  });
});

describe("resolveTryCatchEdges", () => {
  it("resolves try and catch edges", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "tc", "try-node", { sourceHandle: "try" }),
      createEdge("e2", "tc", "catch-node", { sourceHandle: "catch" }),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = resolveTryCatchEdges("tc", edgesBySource);

    expect(result.tryEdge?.target).toBe("try-node");
    expect(result.catchEdge?.target).toBe("catch-node");
  });

  it("returns undefined when edges missing", () => {
    const edgesBySource = new Map<string, ExecutionPlan["edges"]>();

    const result = resolveTryCatchEdges("tc", edgesBySource);

    expect(result.tryEdge).toBeUndefined();
    expect(result.catchEdge).toBeUndefined();
  });
});

describe("validateTryCatchEdges", () => {
  it("throws when try edge missing", () => {
    const catchEdge = createEdge("e1", "tc", "catch");

    expect(() => validateTryCatchEdges("tc", undefined, catchEdge)).toThrow();
  });

  it("throws when catch edge missing", () => {
    const tryEdge = createEdge("e1", "tc", "try");

    expect(() => validateTryCatchEdges("tc", tryEdge, undefined)).toThrow();
  });

  it("does not throw when both edges present", () => {
    const tryEdge = createEdge("e1", "tc", "try");
    const catchEdge = createEdge("e2", "tc", "catch");

    expect(() => validateTryCatchEdges("tc", tryEdge, catchEdge)).not.toThrow();
  });
});

describe("validateUniqueEdgeHandles", () => {
  it("returns map of edges by handle", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "split", "a", { sourceHandle: "branch-a" }),
      createEdge("e2", "split", "b", { sourceHandle: "branch-b" }),
    ];

    const result = validateUniqueEdgeHandles(
      edges,
      "split",
      "Parallel split",
      true
    );

    expect(result.size).toBe(2);
    expect(result.get("branch-a")?.target).toBe("a");
    expect(result.get("branch-b")?.target).toBe("b");
  });

  it("throws for missing handle", () => {
    const edges: ExecutionPlan["edges"] = [createEdge("e1", "split", "a")];

    expect(() =>
      validateUniqueEdgeHandles(edges, "split", "Parallel split", true)
    ).toThrow();
  });

  it("throws for duplicate handle", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "split", "a", { sourceHandle: "branch-a" }),
      createEdge("e2", "split", "b", { sourceHandle: "branch-a" }),
    ];

    expect(() =>
      validateUniqueEdgeHandles(edges, "split", "Parallel split", true)
    ).toThrow();
  });
});
