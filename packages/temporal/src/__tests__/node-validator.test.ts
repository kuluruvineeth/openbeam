import type { ExecutionPlan, ExecutionPlanNode } from "@openbeam/types/canvas";
import { describe, expect, it } from "vitest";
import {
  validateParallelMapNode,
  validateRetryNode,
  validateSubWorkflowNode,
  validateTryCatchNode,
} from "../workflows/canvas/validators/node-validator";

type Edge = ExecutionPlan["edges"][number];

function createNode(
  id: string,
  type: string,
  config: unknown = {}
): ExecutionPlanNode {
  return {
    id,
    type,
    data: { config },
    inbound: [],
    outbound: [],
  } as unknown as ExecutionPlanNode;
}

function createEdge(
  source: string,
  target: string,
  sourceHandle?: string
): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
    type: "control",
  } as Edge;
}

describe("validateSubWorkflowNode", () => {
  it("passes with valid 1-in 1-out sub-workflow", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
      waitForCompletion: true,
      inputMode: "passthrough",
    });
    const issues: string[] = [];

    validateSubWorkflowNode({ node, inbound: 1, outbound: 1, issues });

    expect(issues).toHaveLength(0);
  });

  it("rejects sub-workflow with wrong connection count", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
    });
    const issues: string[] = [];

    validateSubWorkflowNode({ node, inbound: 2, outbound: 1, issues });

    expect(issues).toContain(
      "Sub-workflow node sub_1 must have 1 inbound and 1 outbound"
    );
  });

  it("rejects sub-workflow with 0 outbound", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
    });
    const issues: string[] = [];

    validateSubWorkflowNode({ node, inbound: 1, outbound: 0, issues });

    expect(issues).toContain(
      "Sub-workflow node sub_1 must have 1 inbound and 1 outbound"
    );
  });

  it("validates config when connection count is correct", () => {
    const node = createNode("sub_1", "sub_workflow", { invalid: true });
    const issues: string[] = [];

    validateSubWorkflowNode({ node, inbound: 1, outbound: 1, issues });

    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("validateRetryNode", () => {
  function createRetryParams(
    overrides: {
      targetType?: string;
      targetInbound?: number;
      targetOutbound?: number;
      edgeCount?: number;
      noTarget?: boolean;
      unknownTarget?: boolean;
    } = {}
  ) {
    const retryNode = createNode("retry_1", "retry");
    const targetNode = createNode(
      "target_1",
      overrides.targetType ?? "transform"
    );

    const edges: Edge[] = [];
    const edgeCount = overrides.edgeCount ?? 1;
    for (let i = 0; i < edgeCount; i++) {
      edges.push(
        createEdge("retry_1", overrides.noTarget ? "missing" : "target_1")
      );
    }

    const edgesBySource = new Map<string, Edge[]>();
    edgesBySource.set("retry_1", edges);

    const nodesById = new Map<string, ExecutionPlanNode>();
    nodesById.set("retry_1", retryNode);
    if (!overrides.unknownTarget) {
      nodesById.set("target_1", targetNode);
    }

    const targetInbound = overrides.targetInbound ?? 1;
    const targetOutbound = overrides.targetOutbound ?? 1;

    const inboundMap = new Map<string, Set<string>>();
    const outboundMap = new Map<string, Set<string>>();

    inboundMap.set(
      "target_1",
      new Set(Array.from({ length: targetInbound }, (_, i) => `src_${i}`))
    );
    outboundMap.set(
      "target_1",
      new Set(Array.from({ length: targetOutbound }, (_, i) => `dst_${i}`))
    );

    return {
      node: retryNode,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      nodesById,
      adjacency: { inbound: inboundMap, outbound: outboundMap },
    };
  }

  it("passes with valid retry targeting transform node", () => {
    const params = createRetryParams();
    const issues: string[] = [];

    validateRetryNode({ ...params, issues });

    expect(issues).toHaveLength(0);
  });

  it("passes with retry targeting tool node", () => {
    const params = createRetryParams({ targetType: "tool" });
    const issues: string[] = [];

    validateRetryNode({ ...params, issues });

    expect(issues).toHaveLength(0);
  });

  it("rejects retry with wrong connection count", () => {
    const params = createRetryParams();
    const issues: string[] = [];

    validateRetryNode({ ...params, inbound: 2, outbound: 1, issues });

    expect(issues).toContain("Retry node must have 1 inbound and 1 outbound");
  });

  it("rejects retry targeting forbidden node type", () => {
    const params = createRetryParams({ targetType: "start" });
    const issues: string[] = [];

    validateRetryNode({ ...params, issues });

    expect(issues).toContain(
      "Retry node retry_1 targets unsupported node type start"
    );
  });

  it("rejects retry targeting condition node", () => {
    const params = createRetryParams({ targetType: "condition" });
    const issues: string[] = [];

    validateRetryNode({ ...params, issues });

    expect(issues).toContain(
      "Retry node retry_1 targets unsupported node type condition"
    );
  });

  it("rejects retry when target has multiple inbound", () => {
    const params = createRetryParams({ targetInbound: 2 });
    const issues: string[] = [];

    validateRetryNode({ ...params, issues });

    expect(issues).toContain("Retry target target_1 must have 1 inbound");
  });

  it("rejects retry when target has multiple outbound", () => {
    const params = createRetryParams({ targetOutbound: 3 });
    const issues: string[] = [];

    validateRetryNode({ ...params, issues });

    expect(issues).toContain("Retry target target_1 must have 1 outbound");
  });

  it("rejects retry when target node is unknown", () => {
    const params = createRetryParams({ unknownTarget: true });
    const issues: string[] = [];

    validateRetryNode({ ...params, issues });

    expect(issues).toContain(
      "Retry node retry_1 targets unknown node target_1"
    );
  });
});

describe("validateTryCatchNode", () => {
  function createTryCatchParams(
    overrides: {
      tryType?: string;
      catchType?: string;
      tryInbound?: number;
      tryOutbound?: number;
      catchInbound?: number;
      catchOutbound?: number;
      missingTryEdge?: boolean;
      missingCatchEdge?: boolean;
      unknownTryTarget?: boolean;
      unknownCatchTarget?: boolean;
      sameTarget?: boolean;
      duplicateHandle?: boolean;
      noHandle?: boolean;
      unknownHandle?: boolean;
    } = {}
  ) {
    const tcNode = createNode("tc_1", "try_catch", {});
    const tryNode = createNode("try_1", overrides.tryType ?? "transform");
    const catchNode = overrides.sameTarget
      ? tryNode
      : createNode("catch_1", overrides.catchType ?? "transform");

    const edges: Edge[] = [];
    if (!overrides.missingTryEdge) {
      if (overrides.noHandle) {
        edges.push(createEdge("tc_1", "try_1"));
      } else {
        edges.push(createEdge("tc_1", "try_1", "try"));
      }
    }
    if (!overrides.missingCatchEdge) {
      if (overrides.duplicateHandle) {
        edges.push(createEdge("tc_1", catchNode.id, "try"));
      } else if (overrides.unknownHandle) {
        edges.push(createEdge("tc_1", catchNode.id, "unknown"));
      } else {
        edges.push(createEdge("tc_1", catchNode.id, "catch"));
      }
    }

    const edgesBySource = new Map<string, Edge[]>();
    edgesBySource.set("tc_1", edges);

    const nodesById = new Map<string, ExecutionPlanNode>();
    nodesById.set("tc_1", tcNode);
    if (!overrides.unknownTryTarget) {
      nodesById.set("try_1", tryNode);
    }
    if (!(overrides.unknownCatchTarget || overrides.sameTarget)) {
      nodesById.set("catch_1", catchNode);
    }

    const inboundMap = new Map<string, Set<string>>();
    const outboundMap = new Map<string, Set<string>>();

    const tryIn = overrides.tryInbound ?? 1;
    const tryOut = overrides.tryOutbound ?? 1;
    const catchIn = overrides.catchInbound ?? 1;
    const catchOut = overrides.catchOutbound ?? 1;

    inboundMap.set(
      "try_1",
      new Set(Array.from({ length: tryIn }, (_, i) => `src_${i}`))
    );
    outboundMap.set(
      "try_1",
      new Set(Array.from({ length: tryOut }, (_, i) => `dst_${i}`))
    );
    inboundMap.set(
      catchNode.id,
      new Set(Array.from({ length: catchIn }, (_, i) => `src_${i}`))
    );
    outboundMap.set(
      catchNode.id,
      new Set(Array.from({ length: catchOut }, (_, i) => `dst_${i}`))
    );

    return {
      node: tcNode,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      nodesById,
      adjacency: { inbound: inboundMap, outbound: outboundMap },
    };
  }

  it("passes with valid try/catch node", () => {
    const params = createTryCatchParams();
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toHaveLength(0);
  });

  it("accepts end node as catch target with 0 outbound", () => {
    const params = createTryCatchParams({
      catchType: "end",
      catchOutbound: 0,
    });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toHaveLength(0);
  });

  it("rejects wrong connection count", () => {
    const params = createTryCatchParams();
    const issues: string[] = [];

    validateTryCatchNode({ ...params, inbound: 1, outbound: 1, issues });

    expect(issues).toContain(
      "Try/catch node must have 1 inbound and 2 outbound"
    );
  });

  it("rejects when try branch is missing", () => {
    const params = createTryCatchParams({ missingTryEdge: true });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Try/catch node tc_1 missing try branch");
  });

  it("rejects when catch branch is missing", () => {
    const params = createTryCatchParams({ missingCatchEdge: true });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Try/catch node tc_1 missing catch branch");
  });

  it("rejects edge without handle", () => {
    const params = createTryCatchParams({ noHandle: true });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Try/catch node tc_1 has edge without handle");
  });

  it("rejects duplicate handle", () => {
    const params = createTryCatchParams({ duplicateHandle: true });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Try/catch node tc_1 has duplicate handle try");
  });

  it("rejects unknown handle", () => {
    const params = createTryCatchParams({ unknownHandle: true });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Try/catch node tc_1 has unknown handle unknown");
  });

  it("rejects unsupported try target type", () => {
    const params = createTryCatchParams({ tryType: "start" });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain(
      "Try/catch node tc_1 has unsupported try target start"
    );
  });

  it("rejects unsupported catch target type", () => {
    const params = createTryCatchParams({ catchType: "start" });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain(
      "Try/catch node tc_1 has unsupported catch target start"
    );
  });

  it("rejects same node as both try and catch target", () => {
    const params = createTryCatchParams({ sameTarget: true });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain(
      "Try/catch node tc_1 must not reuse the same target"
    );
  });

  it("rejects try node with wrong connection counts", () => {
    const params = createTryCatchParams({
      tryInbound: 2,
      tryOutbound: 3,
    });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain(
      "Try node try_1 must have 1 inbound and 1 outbound edge"
    );
  });

  it("rejects catch node with multiple inbound", () => {
    const params = createTryCatchParams({ catchInbound: 2 });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Catch node catch_1 must have 1 inbound edge");
  });

  it("rejects non-end catch node with wrong outbound", () => {
    const params = createTryCatchParams({ catchOutbound: 0 });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Catch node catch_1 must have 1 outbound edge");
  });

  it("rejects end catch node with outbound edges", () => {
    const params = createTryCatchParams({
      catchType: "end",
      catchOutbound: 1,
    });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain(
      "Catch end node catch_1 must have 0 outbound edges"
    );
  });

  it("rejects unknown try target", () => {
    const params = createTryCatchParams({ unknownTryTarget: true });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Try/catch node tc_1 has unknown try target");
  });

  it("rejects unknown catch target", () => {
    const params = createTryCatchParams({ unknownCatchTarget: true });
    const issues: string[] = [];

    validateTryCatchNode({ ...params, issues });

    expect(issues).toContain("Try/catch node tc_1 has unknown catch target");
  });
});

describe("validateParallelMapNode", () => {
  function createParallelMapParams(
    overrides: {
      targetType?: string;
      targetInbound?: number;
      targetOutbound?: number;
      edgeCount?: number;
      unknownTarget?: boolean;
      collection?: string;
    } = {}
  ) {
    const mapNode = createNode("map_1", "parallel_map", {
      collection: overrides.collection ?? "items",
    });
    const targetNode = createNode(
      "target_1",
      overrides.targetType ?? "transform"
    );

    const edges: Edge[] = [];
    const edgeCount = overrides.edgeCount ?? 1;
    for (let i = 0; i < edgeCount; i++) {
      edges.push(createEdge("map_1", "target_1"));
    }

    const edgesBySource = new Map<string, Edge[]>();
    edgesBySource.set("map_1", edges);

    const nodesById = new Map<string, ExecutionPlanNode>();
    nodesById.set("map_1", mapNode);
    if (!overrides.unknownTarget) {
      nodesById.set("target_1", targetNode);
    }

    const targetInbound = overrides.targetInbound ?? 1;
    const targetOutbound = overrides.targetOutbound ?? 1;

    const inboundMap = new Map<string, Set<string>>();
    const outboundMap = new Map<string, Set<string>>();

    inboundMap.set(
      "target_1",
      new Set(Array.from({ length: targetInbound }, (_, i) => `src_${i}`))
    );
    outboundMap.set(
      "target_1",
      new Set(Array.from({ length: targetOutbound }, (_, i) => `dst_${i}`))
    );

    return {
      node: mapNode,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      nodesById,
      adjacency: { inbound: inboundMap, outbound: outboundMap },
    };
  }

  it("passes with valid parallel map targeting transform", () => {
    const params = createParallelMapParams();
    const issues: string[] = [];

    validateParallelMapNode({ ...params, issues });

    expect(issues).toHaveLength(0);
  });

  it("rejects wrong connection count", () => {
    const params = createParallelMapParams();
    const issues: string[] = [];

    validateParallelMapNode({ ...params, inbound: 0, outbound: 1, issues });

    expect(issues).toContain(
      "Parallel map node must have 1 inbound and 1 outbound"
    );
  });

  it("rejects invalid config (empty collection)", () => {
    const params = createParallelMapParams({ collection: "  " });
    const issues: string[] = [];

    validateParallelMapNode({ ...params, issues });

    expect(issues).toContain(
      "Parallel map node map_1 requires collection expression"
    );
  });

  it("rejects forbidden target type", () => {
    const params = createParallelMapParams({ targetType: "parallel_map" });
    const issues: string[] = [];

    validateParallelMapNode({ ...params, issues });

    expect(issues).toContain(
      "Parallel map node map_1 targets unsupported node type parallel_map"
    );
  });

  it("rejects unknown target", () => {
    const params = createParallelMapParams({ unknownTarget: true });
    const issues: string[] = [];

    validateParallelMapNode({ ...params, issues });

    expect(issues).toContain(
      "Parallel map node map_1 targets unknown node target_1"
    );
  });

  it("rejects target with multiple inbound", () => {
    const params = createParallelMapParams({ targetInbound: 2 });
    const issues: string[] = [];

    validateParallelMapNode({ ...params, issues });

    expect(issues).toContain(
      "Parallel map target target_1 must have 1 inbound"
    );
  });

  it("rejects target with multiple outbound", () => {
    const params = createParallelMapParams({ targetOutbound: 2 });
    const issues: string[] = [];

    validateParallelMapNode({ ...params, issues });

    expect(issues).toContain(
      "Parallel map target target_1 must have 1 outbound"
    );
  });
});
