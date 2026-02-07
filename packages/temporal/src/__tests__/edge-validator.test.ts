import type { ExecutionPlan, ExecutionPlanNode } from "@openplane/types/canvas";
import { describe, expect, it } from "vitest";
import {
  validateApprovalNodeEdges,
  validateConditionNodeEdges,
  validateInputNodeEdges,
  validateLoopNodeEdges,
  validateParallelJoinNodeEdges,
  validateParallelSplitNodeEdges,
} from "../workflows/canvas/validators/edge-validator";

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
  sourceHandle?: string | null,
  targetHandle?: string | null
): Edge {
  return {
    id: `${source}-${target}-${sourceHandle ?? ""}`,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
    targetHandle: targetHandle ?? null,
    type: "control",
  } as Edge;
}

describe("validateConditionNodeEdges", () => {
  it("passes with valid condition node and branch handles", () => {
    const node = createNode("cond_1", "condition", {
      branches: [
        { id: "yes", label: "Yes", groups: [] },
        { id: "no", label: "No", groups: [] },
      ],
    });

    const edges = [
      createEdge("cond_1", "n1", "yes"),
      createEdge("cond_1", "n2", "no"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["cond_1", edges]]);
    const issues: string[] = [];

    validateConditionNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toHaveLength(0);
  });

  it("rejects condition with 0 inbound", () => {
    const node = createNode("cond_1", "condition", {
      branches: [{ id: "yes", label: "Yes", groups: [] }],
    });
    const issues: string[] = [];

    validateConditionNodeEdges({
      node,
      inbound: 0,
      outbound: 1,
      edgesBySource: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Condition node must have 1 inbound and at least 1 outbound"
    );
  });

  it("rejects condition with 0 outbound", () => {
    const node = createNode("cond_1", "condition", {
      branches: [{ id: "yes", label: "Yes", groups: [] }],
    });
    const issues: string[] = [];

    validateConditionNodeEdges({
      node,
      inbound: 1,
      outbound: 0,
      edgesBySource: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Condition node must have 1 inbound and at least 1 outbound"
    );
  });

  it("rejects edge without handle", () => {
    const node = createNode("cond_1", "condition", {
      branches: [{ id: "yes", label: "Yes", groups: [] }],
    });
    const edges = [createEdge("cond_1", "n1")];
    const edgesBySource = new Map<string, Edge[]>([["cond_1", edges]]);
    const issues: string[] = [];

    validateConditionNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      issues,
    });

    expect(issues).toContain("Condition node cond_1 has edge without handle");
  });

  it("rejects duplicate handle", () => {
    const node = createNode("cond_1", "condition", {
      branches: [
        { id: "yes", label: "Yes", groups: [] },
        { id: "no", label: "No", groups: [] },
      ],
    });
    const edges = [
      createEdge("cond_1", "n1", "yes"),
      createEdge("cond_1", "n2", "yes"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["cond_1", edges]]);
    const issues: string[] = [];

    validateConditionNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain("Condition node cond_1 has duplicate handle yes");
  });

  it("rejects unknown handle", () => {
    const node = createNode("cond_1", "condition", {
      branches: [{ id: "yes", label: "Yes", groups: [] }],
    });
    const edges = [createEdge("cond_1", "n1", "unknown")];
    const edgesBySource = new Map<string, Edge[]>([["cond_1", edges]]);
    const issues: string[] = [];

    validateConditionNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Condition node cond_1 has unknown handle unknown"
    );
  });
});

describe("validateApprovalNodeEdges", () => {
  function createApprovalNode(id = "appr_1") {
    return createNode(id, "approval", {
      message: "Please approve",
      approvalType: "single",
      requiredApprovals: 1,
      allowedActions: ["approve", "reject"],
    });
  }

  it("passes with valid approved and rejected edges", () => {
    const node = createApprovalNode();
    const edges = [
      createEdge("appr_1", "n1", "approved"),
      createEdge("appr_1", "n2", "rejected"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["appr_1", edges]]);
    const issues: string[] = [];

    validateApprovalNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toHaveLength(0);
  });

  it("rejects wrong connection count", () => {
    const node = createApprovalNode();
    const issues: string[] = [];

    validateApprovalNodeEdges({
      node,
      inbound: 0,
      outbound: 2,
      edgesBySource: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Approval node must have 1 inbound and 2 outbound"
    );
  });

  it("rejects fewer than 2 edges", () => {
    const node = createApprovalNode();
    const edges = [createEdge("appr_1", "n1", "approved")];
    const edgesBySource = new Map<string, Edge[]>([["appr_1", edges]]);
    const issues: string[] = [];

    validateApprovalNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Approval node appr_1 requires approved and rejected edges"
    );
  });

  it("rejects edge without handle", () => {
    const node = createApprovalNode();
    const edges = [
      createEdge("appr_1", "n1"),
      createEdge("appr_1", "n2", "rejected"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["appr_1", edges]]);
    const issues: string[] = [];

    validateApprovalNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain("Approval node appr_1 has edge without handle");
  });

  it("rejects unknown handle", () => {
    const node = createApprovalNode();
    const edges = [
      createEdge("appr_1", "n1", "approved"),
      createEdge("appr_1", "n2", "escalated"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["appr_1", edges]]);
    const issues: string[] = [];

    validateApprovalNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Approval node appr_1 has unknown handle escalated"
    );
  });

  it("rejects missing required handles", () => {
    const node = createApprovalNode();
    const edges = [
      createEdge("appr_1", "n1", "approved"),
      createEdge("appr_1", "n2", "approved"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["appr_1", edges]]);
    const issues: string[] = [];

    validateApprovalNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Approval node appr_1 must define approved and rejected handles"
    );
  });
});

describe("validateInputNodeEdges", () => {
  function createInputNode(
    id = "input_1",
    config: Record<string, unknown> = {}
  ) {
    return createNode(id, "input", {
      prompt: "Enter values",
      fields: [{ id: "name", label: "Name", type: "text" }],
      ...config,
    });
  }

  it("passes with single outbound edge (no allowSkip)", () => {
    const node = createInputNode();
    const edges = [createEdge("input_1", "n1", "data")];
    const edgesBySource = new Map<string, Edge[]>([["input_1", edges]]);
    const issues: string[] = [];

    validateInputNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      issues,
    });

    expect(issues).toHaveLength(0);
  });

  it("rejects wrong connection count", () => {
    const node = createInputNode();
    const issues: string[] = [];

    validateInputNodeEdges({
      node,
      inbound: 2,
      outbound: 1,
      edgesBySource: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Input node must have 1 inbound and at least 1 outbound"
    );
  });

  it("passes with allowSkip and data + skipped edges", () => {
    const node = createInputNode("input_1", { allowSkip: true });
    const edges = [
      createEdge("input_1", "n1", "data"),
      createEdge("input_1", "n2", "skipped"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["input_1", edges]]);
    const issues: string[] = [];

    validateInputNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toHaveLength(0);
  });

  it("rejects allowSkip with fewer than 2 edges", () => {
    const node = createInputNode("input_1", { allowSkip: true });
    const edges = [createEdge("input_1", "n1", "data")];
    const edgesBySource = new Map<string, Edge[]>([["input_1", edges]]);
    const issues: string[] = [];

    validateInputNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Input node input_1 requires data and skipped edges"
    );
  });

  it("rejects allowSkip with missing required handles", () => {
    const node = createInputNode("input_1", { allowSkip: true });
    const edges = [
      createEdge("input_1", "n1", "data"),
      createEdge("input_1", "n2", "data"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["input_1", edges]]);
    const issues: string[] = [];

    validateInputNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Input node input_1 must define data and skipped handles"
    );
  });

  it("rejects non-skip node with multiple outbound", () => {
    const node = createInputNode();
    const edges = [
      createEdge("input_1", "n1", "data"),
      createEdge("input_1", "n2", "data"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["input_1", edges]]);
    const issues: string[] = [];

    validateInputNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain("Input node input_1 must have 1 outbound edge");
  });

  it("rejects non-data handle on non-skip node", () => {
    const node = createInputNode();
    const edges = [createEdge("input_1", "n1", "unknown")];
    const edgesBySource = new Map<string, Edge[]>([["input_1", edges]]);
    const issues: string[] = [];

    validateInputNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      issues,
    });

    expect(issues).toContain("Input node input_1 has unknown handle unknown");
  });
});

describe("validateLoopNodeEdges", () => {
  function createLoopNode(id = "loop_1") {
    return createNode(id, "loop", {
      type: "forEach",
      collection: "items",
    });
  }

  it("passes with valid body and done edges", () => {
    const node = createLoopNode();
    const edges = [
      createEdge("loop_1", "body_n", "body"),
      createEdge("loop_1", "done_n", "done"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["loop_1", edges]]);
    const issues: string[] = [];

    validateLoopNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toHaveLength(0);
  });

  it("rejects loop with 0 inbound", () => {
    const node = createLoopNode();
    const issues: string[] = [];

    validateLoopNodeEdges({
      node,
      inbound: 0,
      outbound: 2,
      edgesBySource: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Loop node must have at least 1 inbound and 1 outbound"
    );
  });

  it("rejects loop with 0 outbound", () => {
    const node = createLoopNode();
    const issues: string[] = [];

    validateLoopNodeEdges({
      node,
      inbound: 1,
      outbound: 0,
      edgesBySource: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Loop node must have at least 1 inbound and 1 outbound"
    );
  });

  it("rejects edge without handle", () => {
    const node = createLoopNode();
    const edges = [
      createEdge("loop_1", "n1"),
      createEdge("loop_1", "n2", "done"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["loop_1", edges]]);
    const issues: string[] = [];

    validateLoopNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain("Loop node loop_1 has edge without handle");
  });

  it("rejects missing body and done branches", () => {
    const node = createLoopNode();
    const edges = [createEdge("loop_1", "n1", "unknown")];
    const edgesBySource = new Map<string, Edge[]>([["loop_1", edges]]);
    const issues: string[] = [];

    validateLoopNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Loop node loop_1 must have body and done branches"
    );
  });
});

describe("validateParallelSplitNodeEdges", () => {
  function createSplitNode(
    id = "split_1",
    branches = [
      { id: "b1", label: "Branch 1" },
      { id: "b2", label: "Branch 2" },
    ]
  ) {
    return createNode(id, "parallel_split", { branches });
  }

  it("passes with matching branch handles", () => {
    const node = createSplitNode();
    const edges = [
      createEdge("split_1", "n1", "b1"),
      createEdge("split_1", "n2", "b2"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["split_1", edges]]);
    const issues: string[] = [];

    validateParallelSplitNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toHaveLength(0);
  });

  it("rejects with 1 outbound", () => {
    const node = createSplitNode();
    const issues: string[] = [];

    validateParallelSplitNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesBySource: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Parallel split must have 1 inbound and at least 2 outbound"
    );
  });

  it("rejects mismatched edge count vs branches", () => {
    const node = createSplitNode();
    const edges = [createEdge("split_1", "n1", "b1")];
    const edgesBySource = new Map<string, Edge[]>([["split_1", edges]]);
    const issues: string[] = [];

    validateParallelSplitNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Parallel split node split_1 has missing branch edges"
    );
  });

  it("rejects unknown branch handle", () => {
    const node = createSplitNode();
    const edges = [
      createEdge("split_1", "n1", "b1"),
      createEdge("split_1", "n2", "unknown"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["split_1", edges]]);
    const issues: string[] = [];

    validateParallelSplitNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Parallel split node split_1 has unknown handle unknown"
    );
  });

  it("rejects missing branch handle", () => {
    const node = createSplitNode();
    const edges = [
      createEdge("split_1", "n1", "b1"),
      createEdge("split_1", "n2", "b1"),
    ];
    const edgesBySource = new Map<string, Edge[]>([["split_1", edges]]);
    const issues: string[] = [];

    validateParallelSplitNodeEdges({
      node,
      inbound: 1,
      outbound: 2,
      edgesBySource,
      issues,
    });

    expect(issues).toContain(
      "Parallel split node split_1 missing branch handle b2"
    );
  });
});

describe("validateParallelJoinNodeEdges", () => {
  function createJoinNode(
    id = "join_1",
    inputs = [
      { id: "i1", label: "Input 1" },
      { id: "i2", label: "Input 2" },
    ]
  ) {
    return createNode(id, "parallel_join", { inputs });
  }

  it("passes with matching input handles", () => {
    const node = createJoinNode();
    const edges = [
      createEdge("n1", "join_1", null, "i1"),
      createEdge("n2", "join_1", null, "i2"),
    ];
    const edgesByTarget = new Map<string, Edge[]>([["join_1", edges]]);
    const issues: string[] = [];

    validateParallelJoinNodeEdges({
      node,
      inbound: 2,
      outbound: 1,
      edgesByTarget,
      issues,
    });

    expect(issues).toHaveLength(0);
  });

  it("rejects with fewer than 2 inbound", () => {
    const node = createJoinNode();
    const issues: string[] = [];

    validateParallelJoinNodeEdges({
      node,
      inbound: 1,
      outbound: 1,
      edgesByTarget: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Parallel join must have at least 2 inbound and 1 outbound"
    );
  });

  it("rejects with 0 outbound", () => {
    const node = createJoinNode();
    const issues: string[] = [];

    validateParallelJoinNodeEdges({
      node,
      inbound: 2,
      outbound: 0,
      edgesByTarget: new Map(),
      issues,
    });

    expect(issues).toContain(
      "Parallel join must have at least 2 inbound and 1 outbound"
    );
  });

  it("rejects mismatched edge count vs inputs", () => {
    const node = createJoinNode();
    const edges = [createEdge("n1", "join_1", null, "i1")];
    const edgesByTarget = new Map<string, Edge[]>([["join_1", edges]]);
    const issues: string[] = [];

    validateParallelJoinNodeEdges({
      node,
      inbound: 2,
      outbound: 1,
      edgesByTarget,
      issues,
    });

    expect(issues).toContain(
      "Parallel join node join_1 has missing input edges"
    );
  });

  it("rejects edge without target handle", () => {
    const node = createJoinNode();
    const edges = [
      createEdge("n1", "join_1"),
      createEdge("n2", "join_1", null, "i2"),
    ];
    const edgesByTarget = new Map<string, Edge[]>([["join_1", edges]]);
    const issues: string[] = [];

    validateParallelJoinNodeEdges({
      node,
      inbound: 2,
      outbound: 1,
      edgesByTarget,
      issues,
    });

    expect(issues).toContain(
      "Parallel join node join_1 has edge without handle"
    );
  });

  it("rejects unknown input handle", () => {
    const node = createJoinNode();
    const edges = [
      createEdge("n1", "join_1", null, "i1"),
      createEdge("n2", "join_1", null, "unknown"),
    ];
    const edgesByTarget = new Map<string, Edge[]>([["join_1", edges]]);
    const issues: string[] = [];

    validateParallelJoinNodeEdges({
      node,
      inbound: 2,
      outbound: 1,
      edgesByTarget,
      issues,
    });

    expect(issues).toContain(
      "Parallel join node join_1 has unknown handle unknown"
    );
  });

  it("rejects missing input handle", () => {
    const node = createJoinNode();
    const edges = [
      createEdge("n1", "join_1", null, "i1"),
      createEdge("n2", "join_1", null, "i1"),
    ];
    const edgesByTarget = new Map<string, Edge[]>([["join_1", edges]]);
    const issues: string[] = [];

    validateParallelJoinNodeEdges({
      node,
      inbound: 2,
      outbound: 1,
      edgesByTarget,
      issues,
    });

    expect(issues).toContain("Parallel join node join_1 missing input i2");
  });
});
