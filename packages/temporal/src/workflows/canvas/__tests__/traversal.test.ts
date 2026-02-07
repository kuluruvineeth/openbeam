import type { ExecutionPlan, ExecutionPlanNode } from "@openplane/types/canvas";
import { describe, expect, it } from "vitest";
import {
  type Adjacency,
  collectReachableNodes,
  collectReachableNodesReverse,
  findAllPaths,
  findClosestJoinIds,
  findClosestNodeOfType,
  findEndNodes,
  findStartNodes,
  getInboundEdges,
  getNextNodes,
  getNodeDepths,
  getNodesBetween,
  getNodesInOrder,
  getOutboundEdges,
  getPreviousNodes,
  hasPath,
  topologicalSort,
  topologicalSortFromPlan,
} from "../utils/traversal";

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
  target: string
): ExecutionPlan["edges"][number] {
  return {
    id,
    source,
    target,
    type: "data",
  };
}

function createPlan(
  nodes: ExecutionPlanNode[],
  edges: ExecutionPlan["edges"]
): ExecutionPlan {
  return {
    version: 1,
    startNodeId: nodes[0]?.id ?? "",
    endNodeIds: nodes.filter((n) => n.type === "end").map((n) => n.id),
    nodes,
    edges,
    nodeOrder: nodes.map((n) => n.id),
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

function buildEdgesByTarget(
  edges: ExecutionPlan["edges"]
): Map<string, ExecutionPlan["edges"]> {
  const map = new Map<string, ExecutionPlan["edges"]>();
  for (const edge of edges) {
    const list = map.get(edge.target) ?? [];
    list.push(edge);
    map.set(edge.target, list);
  }
  return map;
}

describe("findStartNodes", () => {
  it("finds start node", () => {
    const plan = createPlan(
      [
        createNode("s", "start"),
        createNode("t", "transform"),
        createNode("e", "end"),
      ],
      []
    );

    const result = findStartNodes(plan);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("s");
  });

  it("finds trigger nodes", () => {
    const plan = createPlan(
      [
        createNode("trigger", "trigger_manual"),
        createNode("t", "transform"),
        createNode("e", "end"),
      ],
      []
    );

    const result = findStartNodes(plan);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("trigger");
  });

  it("ignores annotation nodes when finding start", () => {
    const plan = createPlan(
      [
        createNode("note", "annotation"),
        createNode("s", "start"),
        createNode("e", "end"),
      ],
      []
    );

    const result = findStartNodes(plan);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("s");
  });
});

describe("findEndNodes", () => {
  it("finds end nodes", () => {
    const plan = createPlan(
      [
        createNode("s", "start"),
        createNode("t", "transform"),
        createNode("e1", "end"),
        createNode("e2", "end"),
      ],
      []
    );

    const result = findEndNodes(plan);

    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id).sort()).toEqual(["e1", "e2"]);
  });
});

describe("getNextNodes / getPreviousNodes", () => {
  it("returns next node IDs", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "A", "C"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = getNextNodes("A", edgesBySource);

    expect(result.sort()).toEqual(["B", "C"]);
  });

  it("returns empty array for node with no outgoing edges", () => {
    const edgesBySource = new Map<string, ExecutionPlan["edges"]>();

    const result = getNextNodes("A", edgesBySource);

    expect(result).toEqual([]);
  });

  it("returns previous node IDs", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "C"),
      createEdge("e2", "B", "C"),
    ];
    const edgesByTarget = buildEdgesByTarget(edges);

    const result = getPreviousNodes("C", edgesByTarget);

    expect(result.sort()).toEqual(["A", "B"]);
  });
});

describe("getOutboundEdges / getInboundEdges", () => {
  it("returns outbound edges", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "A", "C"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = getOutboundEdges("A", edgesBySource);

    expect(result).toHaveLength(2);
  });

  it("returns inbound edges", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "C"),
      createEdge("e2", "B", "C"),
    ];
    const edgesByTarget = buildEdgesByTarget(edges);

    const result = getInboundEdges("C", edgesByTarget);

    expect(result).toHaveLength(2);
  });
});

describe("collectReachableNodes", () => {
  it("collects all reachable nodes from start", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "B", "D"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = collectReachableNodes("A", edgesBySource);

    expect(result.size).toBe(4);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
    expect(result.has("C")).toBe(true);
    expect(result.has("D")).toBe(true);
  });

  it("handles disconnected nodes", () => {
    const edges: ExecutionPlan["edges"] = [createEdge("e1", "A", "B")];
    const edgesBySource = buildEdgesBySource(edges);

    const result = collectReachableNodes("A", edgesBySource);

    expect(result.size).toBe(2);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
  });

  it("handles cycles", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "C", "A"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = collectReachableNodes("A", edgesBySource);

    expect(result.size).toBe(3);
  });
});

describe("collectReachableNodesReverse", () => {
  it("collects all nodes that can reach target", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "C"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "C", "D"),
    ];
    const edgesByTarget = buildEdgesByTarget(edges);

    const result = collectReachableNodesReverse("C", edgesByTarget);

    expect(result.size).toBe(3);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
    expect(result.has("C")).toBe(true);
  });
});

describe("findClosestJoinIds", () => {
  it("finds closest parallel_join node", () => {
    const nodes = [
      createNode("split", "parallel_split"),
      createNode("a", "transform"),
      createNode("join", "parallel_join"),
      createNode("end", "end"),
    ];
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "split", "a"),
      createEdge("e2", "a", "join"),
      createEdge("e3", "join", "end"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = findClosestJoinIds("split", nodesById, edgesBySource);

    expect(result.size).toBe(1);
    expect(result.has("join")).toBe(true);
  });

  it("returns empty set when no join exists", () => {
    const nodes = [
      createNode("a", "transform"),
      createNode("b", "transform"),
      createNode("end", "end"),
    ];
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "a", "b"),
      createEdge("e2", "b", "end"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = findClosestJoinIds("a", nodesById, edgesBySource);

    expect(result.size).toBe(0);
  });
});

describe("findClosestNodeOfType", () => {
  it("finds closest node of specified type", () => {
    const nodes = [
      createNode("a", "transform"),
      createNode("b", "transform"),
      createNode("c", "end"),
    ];
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "a", "b"),
      createEdge("e2", "b", "c"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = findClosestNodeOfType("a", "end", nodesById, edgesBySource);

    expect(result).toBe("c");
  });

  it("returns null when no matching node exists", () => {
    const nodes = [createNode("a", "transform"), createNode("b", "transform")];
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const edges: ExecutionPlan["edges"] = [createEdge("e1", "a", "b")];
    const edgesBySource = buildEdgesBySource(edges);

    const result = findClosestNodeOfType("a", "end", nodesById, edgesBySource);

    expect(result).toBeNull();
  });
});

describe("topologicalSort", () => {
  it("returns nodes in topological order", () => {
    const nodeIds = new Set(["A", "B", "C", "D"]);
    const adjacency: Adjacency = {
      inbound: new Map([
        ["A", new Set<string>()],
        ["B", new Set(["A"])],
        ["C", new Set(["A"])],
        ["D", new Set(["B", "C"])],
      ]),
      outbound: new Map([
        ["A", new Set(["B", "C"])],
        ["B", new Set(["D"])],
        ["C", new Set(["D"])],
        ["D", new Set<string>()],
      ]),
    };

    const result = topologicalSort(nodeIds, adjacency);

    expect(result[0]).toBe("A");
    expect(result.at(-1)).toBe("D");
    expect(result.indexOf("B")).toBeLessThan(result.indexOf("D"));
    expect(result.indexOf("C")).toBeLessThan(result.indexOf("D"));
  });

  it("handles empty graph", () => {
    const nodeIds = new Set<string>();
    const adjacency: Adjacency = {
      inbound: new Map(),
      outbound: new Map(),
    };

    const result = topologicalSort(nodeIds, adjacency);

    expect(result).toEqual([]);
  });

  it("handles single node", () => {
    const nodeIds = new Set(["A"]);
    const adjacency: Adjacency = {
      inbound: new Map([["A", new Set<string>()]]),
      outbound: new Map([["A", new Set<string>()]]),
    };

    const result = topologicalSort(nodeIds, adjacency);

    expect(result).toEqual(["A"]);
  });
});

describe("topologicalSortFromPlan", () => {
  it("returns nodes in topological order from plan", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("a", "transform"),
        createNode("b", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "a"),
        createEdge("e2", "start", "b"),
        createEdge("e3", "a", "end"),
        createEdge("e4", "b", "end"),
      ]
    );

    const result = topologicalSortFromPlan(plan);

    expect(result[0]).toBe("start");
    expect(result.at(-1)).toBe("end");
  });
});

describe("hasPath", () => {
  it("returns true when path exists", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    expect(hasPath("A", "C", edgesBySource)).toBe(true);
  });

  it("returns false when no path exists", () => {
    const edges: ExecutionPlan["edges"] = [createEdge("e1", "A", "B")];
    const edgesBySource = buildEdgesBySource(edges);

    expect(hasPath("B", "A", edgesBySource)).toBe(false);
  });

  it("returns true for same node", () => {
    const edgesBySource = new Map<string, ExecutionPlan["edges"]>();

    expect(hasPath("A", "A", edgesBySource)).toBe(true);
  });
});

describe("findAllPaths", () => {
  it("finds all paths between nodes", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "A", "C"),
      createEdge("e3", "B", "D"),
      createEdge("e4", "C", "D"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = findAllPaths("A", "D", edgesBySource);

    expect(result).toHaveLength(2);
    expect(result.some((p) => p.join("->") === "A->B->D")).toBe(true);
    expect(result.some((p) => p.join("->") === "A->C->D")).toBe(true);
  });

  it("returns single path for linear graph", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = findAllPaths("A", "C", edgesBySource);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(["A", "B", "C"]);
  });

  it("returns empty array when no path exists", () => {
    const edges: ExecutionPlan["edges"] = [createEdge("e1", "A", "B")];
    const edgesBySource = buildEdgesBySource(edges);

    const result = findAllPaths("B", "A", edgesBySource);

    expect(result).toHaveLength(0);
  });

  it("respects max depth", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "C", "D"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = findAllPaths("A", "D", edgesBySource, 2);

    expect(result).toHaveLength(0);
  });
});

describe("getNodesInOrder", () => {
  it("returns nodes in BFS order", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = getNodesInOrder("A", "C", edgesBySource);

    expect(result).toEqual(["A", "B", "C"]);
  });

  it("stops at end node", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "C", "D"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = getNodesInOrder("A", "C", edgesBySource);

    expect(result).toEqual(["A", "B", "C"]);
  });
});

describe("getNodeDepths", () => {
  it("calculates depth from start node", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "A", "C"),
      createEdge("e3", "B", "D"),
      createEdge("e4", "C", "D"),
    ];
    const edgesBySource = buildEdgesBySource(edges);

    const result = getNodeDepths("A", edgesBySource);

    expect(result.get("A")).toBe(0);
    expect(result.get("B")).toBe(1);
    expect(result.get("C")).toBe(1);
    expect(result.get("D")).toBe(2);
  });
});

describe("getNodesBetween", () => {
  it("returns nodes between start and end", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "C", "D"),
    ];
    const edgesBySource = buildEdgesBySource(edges);
    const edgesByTarget = buildEdgesByTarget(edges);

    const result = getNodesBetween("A", "D", edgesBySource, edgesByTarget);

    expect(result.size).toBe(4);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
    expect(result.has("C")).toBe(true);
    expect(result.has("D")).toBe(true);
  });

  it("excludes unreachable branches", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "A", "X"),
    ];
    const edgesBySource = buildEdgesBySource(edges);
    const edgesByTarget = buildEdgesByTarget(edges);

    const result = getNodesBetween("A", "C", edgesBySource, edgesByTarget);

    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
    expect(result.has("C")).toBe(true);
    expect(result.has("X")).toBe(false);
  });
});
