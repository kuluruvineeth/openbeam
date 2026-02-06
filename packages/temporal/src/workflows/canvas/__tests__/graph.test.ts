import type { ExecutionPlan, ExecutionPlanNode } from "@openplane/types/canvas";
import { describe, expect, it } from "vitest";
import {
  buildAdjacency,
  buildEdgeIndex,
  buildExecutionGraph,
  buildNodeIndex,
  containsInvalidCycle,
  getExecutableEdges,
  getExecutableNodes,
} from "../utils/graph";

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

describe("getExecutableNodes", () => {
  it("filters out annotation nodes", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("transform", "transform"),
        createNode("note", "annotation"),
        createNode("end", "end"),
      ],
      []
    );

    const result = getExecutableNodes(plan);

    expect(result).toHaveLength(3);
    expect(result.map((n) => n.id)).toEqual(["start", "transform", "end"]);
  });

  it("returns all nodes when no annotations exist", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("transform", "transform"),
        createNode("end", "end"),
      ],
      []
    );

    const result = getExecutableNodes(plan);

    expect(result).toHaveLength(3);
  });

  it("returns empty array for plan with only annotations", () => {
    const plan = createPlan([createNode("note", "annotation")], []);

    const result = getExecutableNodes(plan);

    expect(result).toHaveLength(0);
  });
});

describe("buildNodeIndex", () => {
  it("creates a map from node IDs to nodes", () => {
    const nodes = [
      createNode("start", "start"),
      createNode("transform", "transform"),
      createNode("end", "end"),
    ];

    const result = buildNodeIndex(nodes);

    expect(result.size).toBe(3);
    expect(result.get("start")?.type).toBe("start");
    expect(result.get("transform")?.type).toBe("transform");
    expect(result.get("end")?.type).toBe("end");
  });

  it("handles empty node list", () => {
    const result = buildNodeIndex([]);

    expect(result.size).toBe(0);
  });
});

describe("getExecutableEdges", () => {
  it("filters edges connected to annotation nodes", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("note", "annotation"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "note"),
        createEdge("e2", "start", "end"),
        createEdge("e3", "note", "end"),
      ]
    );

    const result = getExecutableEdges(plan);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("e2");
  });

  it("returns all edges when no annotations exist", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("transform", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "transform"),
        createEdge("e2", "transform", "end"),
      ]
    );

    const result = getExecutableEdges(plan);

    expect(result).toHaveLength(2);
  });
});

describe("buildEdgeIndex", () => {
  it("creates source and target maps", () => {
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "start", "transform"),
      createEdge("e2", "transform", "end"),
      createEdge("e3", "start", "filter"),
    ];

    const result = buildEdgeIndex(edges);

    expect(result.edgesBySource.get("start")).toHaveLength(2);
    expect(result.edgesBySource.get("transform")).toHaveLength(1);
    expect(result.edgesByTarget.get("transform")).toHaveLength(1);
    expect(result.edgesByTarget.get("end")).toHaveLength(1);
    expect(result.edgesByTarget.get("filter")).toHaveLength(1);
  });

  it("handles nodes with no edges", () => {
    const edges: ExecutionPlan["edges"] = [];

    const result = buildEdgeIndex(edges);

    expect(result.edgesBySource.size).toBe(0);
    expect(result.edgesByTarget.size).toBe(0);
  });
});

describe("buildExecutionGraph", () => {
  it("combines nodes and edges into a graph structure", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("transform", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "transform"),
        createEdge("e2", "transform", "end"),
      ]
    );

    const result = buildExecutionGraph(plan);

    expect(result.nodesById.size).toBe(3);
    expect(result.edgesBySource.get("start")).toHaveLength(1);
    expect(result.edgesByTarget.get("end")).toHaveLength(1);
  });
});

describe("buildAdjacency", () => {
  it("builds inbound and outbound adjacency sets", () => {
    const nodeIds = new Set(["A", "B", "C"]);
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "A", "C"),
    ];

    const result = buildAdjacency(nodeIds, edges);

    expect(result.outbound.get("A")).toEqual(new Set(["B", "C"]));
    expect(result.outbound.get("B")).toEqual(new Set(["C"]));
    expect(result.outbound.get("C")).toEqual(new Set());
    expect(result.inbound.get("A")).toEqual(new Set());
    expect(result.inbound.get("B")).toEqual(new Set(["A"]));
    expect(result.inbound.get("C")).toEqual(new Set(["B", "A"]));
  });

  it("ignores edges to nodes not in nodeIds", () => {
    const nodeIds = new Set(["A", "B"]);
    const edges: ExecutionPlan["edges"] = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
    ];

    const result = buildAdjacency(nodeIds, edges);

    expect(result.outbound.get("A")).toEqual(new Set(["B"]));
    expect(result.outbound.get("B")).toEqual(new Set());
  });
});

describe("containsInvalidCycle", () => {
  it("returns false for acyclic graph", () => {
    const nodeIds = new Set(["A", "B", "C"]);
    const outbound = new Map([
      ["A", new Set(["B"])],
      ["B", new Set(["C"])],
      ["C", new Set<string>()],
    ]);
    const nodeTypes = new Map<string, ExecutionPlanNode["type"]>([
      ["A", "start"],
      ["B", "transform"],
      ["C", "end"],
    ]);

    const result = containsInvalidCycle(nodeIds, outbound, nodeTypes);

    expect(result).toBe(false);
  });

  it("returns true for cycle without loop node", () => {
    const nodeIds = new Set(["A", "B", "C"]);
    const outbound = new Map([
      ["A", new Set(["B"])],
      ["B", new Set(["C"])],
      ["C", new Set(["A"])],
    ]);
    const nodeTypes = new Map<string, ExecutionPlanNode["type"]>([
      ["A", "start"],
      ["B", "transform"],
      ["C", "transform"],
    ]);

    const result = containsInvalidCycle(nodeIds, outbound, nodeTypes);

    expect(result).toBe(true);
  });

  it("returns false for cycle containing loop node", () => {
    const nodeIds = new Set(["A", "B", "C"]);
    const outbound = new Map([
      ["A", new Set(["B"])],
      ["B", new Set(["C"])],
      ["C", new Set(["B"])],
    ]);
    const nodeTypes = new Map<string, ExecutionPlanNode["type"]>([
      ["A", "start"],
      ["B", "loop"],
      ["C", "transform"],
    ]);

    const result = containsInvalidCycle(nodeIds, outbound, nodeTypes);

    expect(result).toBe(false);
  });

  it("handles disconnected nodes", () => {
    const nodeIds = new Set(["A", "B", "C"]);
    const outbound = new Map([
      ["A", new Set<string>()],
      ["B", new Set<string>()],
      ["C", new Set<string>()],
    ]);
    const nodeTypes = new Map<string, ExecutionPlanNode["type"]>([
      ["A", "start"],
      ["B", "transform"],
      ["C", "end"],
    ]);

    const result = containsInvalidCycle(nodeIds, outbound, nodeTypes);

    expect(result).toBe(false);
  });

  it("detects self-loop without loop node", () => {
    const nodeIds = new Set(["A"]);
    const outbound = new Map([["A", new Set(["A"])]]);
    const nodeTypes = new Map<string, ExecutionPlanNode["type"]>([
      ["A", "transform"],
    ]);

    const result = containsInvalidCycle(nodeIds, outbound, nodeTypes);

    expect(result).toBe(true);
  });
});
