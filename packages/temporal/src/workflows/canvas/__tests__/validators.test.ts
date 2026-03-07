import type { ExecutionPlan, ExecutionPlanNode } from "@openbeam/types/canvas";
import { describe, expect, it } from "vitest";
import {
  ENTRY_NODE_TYPES,
  enforceExecutionPlan,
  ensureSupportedNodes,
  SUPPORTED_NODE_TYPES,
} from "../utils/validators";

const UNSUPPORTED_NODE_TYPES_PATTERN = /Unsupported node types/;
const EXACTLY_ONE_START_PATTERN = /exactly one start or trigger/;
const AT_LEAST_ONE_END_PATTERN = /at least one end node/;
const ZERO_INBOUND_ONE_OUTBOUND_PATTERN = /0 inbound and 1 outbound/;
const AT_LEAST_ONE_INBOUND_PATTERN = /at least 1 inbound and 0 outbound/;
const BODY_AND_DONE_PATTERN = /body and done branches/;
const UNSUPPORTED_CYCLE_PATTERN = /unsupported cycle/;
const UNSUPPORTED_NODE_TYPE_PATTERN = /unsupported node type/;

function createNode(
  id: string,
  type: ExecutionPlanNode["type"],
  data: Record<string, unknown> = {}
): ExecutionPlanNode {
  return {
    id,
    type,
    data,
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

describe("SUPPORTED_NODE_TYPES", () => {
  it("includes all common node types", () => {
    const expected = [
      "start",
      "end",
      "transform",
      "filter",
      "condition",
      "loop",
      "parallel_split",
      "parallel_join",
      "retry",
      "parallel_map",
      "try_catch",
      "template",
      "code",
      "notify",
      "approval",
      "input",
      "sub_workflow",
      "llm",
      "agent_call",
      "http_request",
      "database_query",
    ];

    for (const type of expected) {
      expect(SUPPORTED_NODE_TYPES.has(type)).toBe(true);
    }
  });

  it("excludes annotation", () => {
    expect(SUPPORTED_NODE_TYPES.has("annotation")).toBe(false);
  });
});

describe("ENTRY_NODE_TYPES", () => {
  it("includes start and trigger nodes", () => {
    expect(ENTRY_NODE_TYPES.has("start")).toBe(true);
    expect(ENTRY_NODE_TYPES.has("trigger_manual")).toBe(true);
    expect(ENTRY_NODE_TYPES.has("trigger_schedule")).toBe(true);
    expect(ENTRY_NODE_TYPES.has("trigger_webhook")).toBe(true);
    expect(ENTRY_NODE_TYPES.has("trigger_event")).toBe(true);
  });

  it("excludes non-entry nodes", () => {
    expect(ENTRY_NODE_TYPES.has("end")).toBe(false);
    expect(ENTRY_NODE_TYPES.has("transform")).toBe(false);
  });
});

describe("ensureSupportedNodes", () => {
  it("does not throw for valid node types", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("transform", "transform"),
        createNode("end", "end"),
      ],
      []
    );

    expect(() => ensureSupportedNodes(plan)).not.toThrow();
  });

  it("throws for unsupported node type", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("custom", "custom_node" as ExecutionPlanNode["type"]),
        createNode("end", "end"),
      ],
      []
    );

    expect(() => ensureSupportedNodes(plan)).toThrow(
      UNSUPPORTED_NODE_TYPES_PATTERN
    );
  });

  it("ignores annotation nodes", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("note", "annotation"),
        createNode("end", "end"),
      ],
      []
    );

    expect(() => ensureSupportedNodes(plan)).not.toThrow();
  });
});

describe("enforceExecutionPlan", () => {
  it("passes for valid linear plan", () => {
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

    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });

  it("throws when no start node", () => {
    const plan = createPlan(
      [createNode("transform", "transform"), createNode("end", "end")],
      [createEdge("e1", "transform", "end")]
    );

    expect(() => enforceExecutionPlan(plan)).toThrow(EXACTLY_ONE_START_PATTERN);
  });

  it("throws when multiple start nodes", () => {
    const plan = createPlan(
      [
        createNode("start1", "start"),
        createNode("start2", "trigger_manual"),
        createNode("end", "end"),
      ],
      [createEdge("e1", "start1", "end"), createEdge("e2", "start2", "end")]
    );

    expect(() => enforceExecutionPlan(plan)).toThrow(EXACTLY_ONE_START_PATTERN);
  });

  it("throws when no end node", () => {
    const plan = createPlan(
      [createNode("start", "start"), createNode("transform", "transform")],
      [createEdge("e1", "start", "transform")]
    );

    expect(() => enforceExecutionPlan(plan)).toThrow(AT_LEAST_ONE_END_PATTERN);
  });

  it("throws when start has inbound edges", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("transform", "transform"),
        createNode("end", "end"),
      ],
      [createEdge("e1", "transform", "start"), createEdge("e2", "start", "end")]
    );

    expect(() => enforceExecutionPlan(plan)).toThrow(
      ZERO_INBOUND_ONE_OUTBOUND_PATTERN
    );
  });

  it("throws when end has outbound edges", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("end", "end"),
        createNode("extra", "transform"),
      ],
      [createEdge("e1", "start", "end"), createEdge("e2", "end", "extra")]
    );

    expect(() => enforceExecutionPlan(plan)).toThrow(
      AT_LEAST_ONE_INBOUND_PATTERN
    );
  });

  it("validates condition node has correct edges", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("condition", "condition", {
          config: {
            mode: "visual",
            evaluationOrder: "sequential",
            branches: [{ id: "true", label: "True", groups: [] }],
            defaultBranchLabel: "",
          },
        }),
        createNode("branch-true", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "condition"),
        createEdge("e2", "condition", "branch-true", { sourceHandle: "true" }),
        createEdge("e3", "branch-true", "end"),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });

  it("validates loop node has body and done handles", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("loop", "loop", {
          config: {
            type: "times",
            times: 3,
            executionMode: "sequential",
            errorHandling: "stop",
            maxIterations: 10,
            outputMode: "all",
          },
        }),
        createNode("body", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "loop"),
        createEdge("e2", "loop", "body", { sourceHandle: "body" }),
        createEdge("e3", "body", "loop"),
        createEdge("e4", "loop", "end", { sourceHandle: "done" }),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });

  it("throws when loop missing body handle", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("loop", "loop", {
          config: {
            type: "times",
            times: 3,
            executionMode: "sequential",
            errorHandling: "stop",
            maxIterations: 10,
            outputMode: "all",
          },
        }),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "loop"),
        createEdge("e2", "loop", "end", { sourceHandle: "done" }),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).toThrow(BODY_AND_DONE_PATTERN);
  });

  it("validates parallel split has matching join", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("split", "parallel_split", {
          config: {
            branches: [
              { id: "a", label: "A" },
              { id: "b", label: "B" },
            ],
            dataDistribution: "broadcast",
            executionMode: "parallel",
            maxConcurrency: 2,
            waitForAll: true,
            errorHandling: "failFast",
          },
        }),
        createNode("a", "transform"),
        createNode("b", "transform"),
        createNode("join", "parallel_join", {
          config: {
            inputs: [
              { id: "input-a", label: "A" },
              { id: "input-b", label: "B" },
            ],
            joinMode: "waitForAll",
            mergeStrategy: "append",
            emptyBranchHandling: "includeEmpty",
            errorHandling: "failFast",
          },
        }),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "split"),
        createEdge("e2", "split", "a", { sourceHandle: "a" }),
        createEdge("e3", "split", "b", { sourceHandle: "b" }),
        createEdge("e4", "a", "join", { targetHandle: "input-a" }),
        createEdge("e5", "b", "join", { targetHandle: "input-b" }),
        createEdge("e6", "join", "end"),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });

  it("throws for invalid cycle without loop", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("a", "transform"),
        createNode("b", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "a"),
        createEdge("e2", "a", "b"),
        createEdge("e3", "b", "a"),
        createEdge("e4", "b", "end"),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).toThrow(UNSUPPORTED_CYCLE_PATTERN);
  });

  it("validates approval node requires approved and rejected handles", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("approval", "approval", {
          config: {
            message: "Please approve this request",
            approvalType: "single",
            requiredApprovals: 1,
            allowedActions: ["approve", "reject"],
            autoApprove: false,
          },
        }),
        createNode("approved", "transform"),
        createNode("rejected", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "approval"),
        createEdge("e2", "approval", "approved", { sourceHandle: "approved" }),
        createEdge("e3", "approval", "rejected", { sourceHandle: "rejected" }),
        createEdge("e4", "approved", "end"),
        createEdge("e5", "rejected", "end"),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });

  it("validates retry node targets allowed node type", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("retry", "retry", {
          config: { maxAttempts: 3, backoffMs: 1000, exponential: false },
        }),
        createNode("http", "http_request"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "retry"),
        createEdge("e2", "retry", "http"),
        createEdge("e3", "http", "end"),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });

  it("throws when retry targets forbidden node type", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("retry", "retry", {
          config: { maxAttempts: 3, backoffMs: 1000, exponential: false },
        }),
        createNode("loop", "loop", {
          config: {
            type: "times",
            times: 3,
            executionMode: "sequential",
            errorHandling: "stop",
            maxIterations: 10,
            outputMode: "all",
          },
        }),
        createNode("body", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "retry"),
        createEdge("e2", "retry", "loop"),
        createEdge("e3", "loop", "body", { sourceHandle: "body" }),
        createEdge("e4", "body", "loop"),
        createEdge("e5", "loop", "end", { sourceHandle: "done" }),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).toThrow(
      UNSUPPORTED_NODE_TYPE_PATTERN
    );
  });

  it("validates try/catch node has try and catch branches", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("try-catch", "try_catch", {
          config: { rethrowUnhandled: true, logErrors: false },
        }),
        createNode("try-node", "http_request"),
        createNode("catch-node", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "try-catch"),
        createEdge("e2", "try-catch", "try-node", { sourceHandle: "try" }),
        createEdge("e3", "try-catch", "catch-node", { sourceHandle: "catch" }),
        createEdge("e4", "try-node", "end"),
        createEdge("e5", "catch-node", "end"),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });

  it("validates parallel_map node has valid target", () => {
    const plan = createPlan(
      [
        createNode("start", "start"),
        createNode("map", "parallel_map", {
          config: {
            collection: "input.items",
            itemVariable: "item",
            indexVariable: "index",
            maxConcurrency: 2,
            continueOnError: false,
            aggregationMode: "array",
            progressTracking: false,
          },
        }),
        createNode("target", "transform"),
        createNode("end", "end"),
      ],
      [
        createEdge("e1", "start", "map"),
        createEdge("e2", "map", "target"),
        createEdge("e3", "target", "end"),
      ]
    );

    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });
});
