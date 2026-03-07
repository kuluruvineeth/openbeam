import type { ExecutionPlan } from "@openbeam/types/canvas";
import { describe, expect, it, vi } from "vitest";

const UNSUPPORTED_NODE_RE = /Unsupported node types.*completely_unknown_type/;
const MAGIC_NODE_RE = /magic_node/;
const EXACTLY_ONE_START_RE = /exactly one start or trigger node/;
const AT_LEAST_ONE_END_RE = /at least one end node/;
const START_0_INBOUND_RE = /Start or trigger node must have 0 inbound/;
const END_INBOUND_OUTBOUND_RE =
  /End node must have at least 1 inbound and 0 outbound/;
const START_0_INBOUND_1_OUTBOUND_RE =
  /Start or trigger node must have 0 inbound and 1 outbound/;

vi.mock("@temporalio/workflow", () => ({
  ApplicationFailure: {
    nonRetryable: (message: string, type: string) => {
      const err = new Error(message);
      err.name = type;
      return err;
    },
  },
}));

import {
  enforceExecutionPlan,
  ensureSupportedNodes,
  validateGraphStructure,
  validateSupportedNodes,
} from "../workflows/canvas/validators/graph-validator";
import {
  ENTRY_NODE_TYPES,
  SUPPORTED_NODE_TYPES,
} from "../workflows/canvas/validators/types";

function createEdge(
  source: string,
  target: string,
  opts: { sourceHandle?: string; type?: string } = {}
) {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: opts.sourceHandle ?? null,
    type: opts.type ?? "default",
  };
}

function createNode(id: string, type: string, opts: { data?: unknown } = {}) {
  return {
    id,
    type,
    data: opts.data ?? {},
    inbound: [],
    outbound: [],
  };
}

function createLinearPlan(): ExecutionPlan {
  return {
    version: 1,
    startNodeId: "start",
    endNodeIds: ["end"],
    nodes: [
      createNode("start", "start"),
      createNode("transform", "transform"),
      createNode("end", "end"),
    ],
    edges: [createEdge("start", "transform"), createEdge("transform", "end")],
    nodeOrder: ["start", "transform", "end"],
  } as unknown as ExecutionPlan;
}

describe("validateSupportedNodes", () => {
  it("accepts plan with supported node types", () => {
    const plan = createLinearPlan();
    expect(() => validateSupportedNodes(plan)).not.toThrow();
  });

  it("rejects plan with unsupported node type", () => {
    const plan = {
      ...createLinearPlan(),
      nodes: [
        createNode("start", "start"),
        createNode("invalid", "completely_unknown_type"),
        createNode("end", "end"),
      ],
      edges: [createEdge("start", "invalid"), createEdge("invalid", "end")],
    } as unknown as ExecutionPlan;

    expect(() => validateSupportedNodes(plan)).toThrow(UNSUPPORTED_NODE_RE);
  });

  it("reports multiple unsupported types", () => {
    const plan = {
      ...createLinearPlan(),
      nodes: [
        createNode("start", "start"),
        createNode("foo", "magic_node"),
        createNode("bar", "quantum_node"),
        createNode("end", "end"),
      ],
      edges: [
        createEdge("start", "foo"),
        createEdge("foo", "bar"),
        createEdge("bar", "end"),
      ],
    } as unknown as ExecutionPlan;

    expect(() => validateSupportedNodes(plan)).toThrow(MAGIC_NODE_RE);
  });

  it("ignores annotation nodes", () => {
    const plan = {
      ...createLinearPlan(),
      nodes: [...createLinearPlan().nodes, createNode("note", "annotation")],
    } as unknown as ExecutionPlan;

    expect(() => validateSupportedNodes(plan)).not.toThrow();
  });
});

describe("validateGraphStructure", () => {
  it("accepts a valid linear plan", () => {
    const plan = createLinearPlan();
    expect(() => validateGraphStructure(plan)).not.toThrow();
  });

  it("rejects plan with no start node", () => {
    const plan = {
      version: 1,
      startNodeId: "transform",
      endNodeIds: ["end"],
      nodes: [createNode("transform", "transform"), createNode("end", "end")],
      edges: [createEdge("transform", "end")],
      nodeOrder: ["transform", "end"],
    } as unknown as ExecutionPlan;

    expect(() => validateGraphStructure(plan)).toThrow(EXACTLY_ONE_START_RE);
  });

  it("rejects plan with multiple start nodes", () => {
    const plan = {
      version: 1,
      startNodeId: "start1",
      endNodeIds: ["end"],
      nodes: [
        createNode("start1", "start"),
        createNode("start2", "start"),
        createNode("end", "end"),
      ],
      edges: [createEdge("start1", "end"), createEdge("start2", "end")],
      nodeOrder: ["start1", "start2", "end"],
    } as unknown as ExecutionPlan;

    expect(() => validateGraphStructure(plan)).toThrow(EXACTLY_ONE_START_RE);
  });

  it("rejects plan with no end node", () => {
    const plan = {
      version: 1,
      startNodeId: "start",
      endNodeIds: [],
      nodes: [
        createNode("start", "start"),
        createNode("transform", "transform"),
      ],
      edges: [createEdge("start", "transform")],
      nodeOrder: ["start", "transform"],
    } as unknown as ExecutionPlan;

    expect(() => validateGraphStructure(plan)).toThrow(AT_LEAST_ONE_END_RE);
  });

  it("rejects start node with inbound edges", () => {
    const plan = {
      version: 1,
      startNodeId: "start",
      endNodeIds: ["end"],
      nodes: [
        createNode("start", "start"),
        createNode("mid", "transform"),
        createNode("end", "end"),
      ],
      edges: [
        createEdge("start", "mid"),
        createEdge("mid", "start"),
        createEdge("mid", "end"),
      ],
      nodeOrder: ["start", "mid", "end"],
    } as unknown as ExecutionPlan;

    expect(() => validateGraphStructure(plan)).toThrow(START_0_INBOUND_RE);
  });

  it("rejects end node with outbound edges", () => {
    const plan = {
      version: 1,
      startNodeId: "start",
      endNodeIds: ["end"],
      nodes: [
        createNode("start", "start"),
        createNode("mid", "transform"),
        createNode("end", "end"),
      ],
      edges: [
        createEdge("start", "mid"),
        createEdge("mid", "end"),
        createEdge("end", "mid"),
      ],
      nodeOrder: ["start", "mid", "end"],
    } as unknown as ExecutionPlan;

    expect(() => validateGraphStructure(plan)).toThrow(END_INBOUND_OUTBOUND_RE);
  });

  it("rejects node with wrong edge count", () => {
    const plan = {
      version: 1,
      startNodeId: "start",
      endNodeIds: ["end"],
      nodes: [
        createNode("start", "start"),
        createNode("transform", "transform"),
        createNode("end", "end"),
      ],
      edges: [
        createEdge("start", "transform"),
        createEdge("transform", "end"),
        createEdge("start", "end"),
      ],
      nodeOrder: ["start", "transform", "end"],
    } as unknown as ExecutionPlan;

    expect(() => validateGraphStructure(plan)).toThrow(
      START_0_INBOUND_1_OUTBOUND_RE
    );
  });

  it("accepts plan with trigger node instead of start", () => {
    const plan = {
      version: 1,
      startNodeId: "trigger",
      endNodeIds: ["end"],
      nodes: [
        createNode("trigger", "trigger_webhook"),
        createNode("transform", "transform"),
        createNode("end", "end"),
      ],
      edges: [
        createEdge("trigger", "transform"),
        createEdge("transform", "end"),
      ],
      nodeOrder: ["trigger", "transform", "end"],
    } as unknown as ExecutionPlan;

    expect(() => validateGraphStructure(plan)).not.toThrow();
  });

  it("accepts plan with condition node (2 outbound)", () => {
    const plan = {
      version: 1,
      startNodeId: "start",
      endNodeIds: ["end1", "end2"],
      nodes: [
        createNode("start", "start"),
        createNode("cond", "condition", {
          data: {
            config: {
              branches: [
                { id: "true", label: "True", condition: "true" },
                { id: "false", label: "False", condition: "false" },
              ],
            },
          },
        }),
        createNode("end1", "end"),
        createNode("end2", "end"),
      ],
      edges: [
        createEdge("start", "cond"),
        createEdge("cond", "end1", { sourceHandle: "true" }),
        createEdge("cond", "end2", { sourceHandle: "false" }),
      ],
      nodeOrder: ["start", "cond", "end1", "end2"],
    } as unknown as ExecutionPlan;

    expect(() => validateGraphStructure(plan)).not.toThrow();
  });
});

describe("enforceExecutionPlan", () => {
  it("delegates to validateGraphStructure", () => {
    const plan = createLinearPlan();
    expect(() => enforceExecutionPlan(plan)).not.toThrow();
  });

  it("throws on invalid plan", () => {
    const plan = {
      version: 1,
      startNodeId: "start",
      endNodeIds: [],
      nodes: [createNode("start", "start")],
      edges: [],
      nodeOrder: ["start"],
    } as unknown as ExecutionPlan;

    expect(() => enforceExecutionPlan(plan)).toThrow();
  });
});

describe("ensureSupportedNodes", () => {
  it("delegates to validateSupportedNodes", () => {
    const plan = createLinearPlan();
    expect(() => ensureSupportedNodes(plan)).not.toThrow();
  });
});

describe("SUPPORTED_NODE_TYPES", () => {
  it("includes all entry node types", () => {
    for (const entryType of ENTRY_NODE_TYPES) {
      expect(SUPPORTED_NODE_TYPES.has(entryType)).toBe(true);
    }
  });

  it("includes essential node types", () => {
    const essential = [
      "start",
      "end",
      "transform",
      "filter",
      "condition",
      "loop",
      "parallel_split",
      "parallel_join",
      "approval",
      "input",
      "sub_workflow",
      "llm",
      "tool",
    ];
    for (const type of essential) {
      expect(
        SUPPORTED_NODE_TYPES.has(type),
        `${type} should be supported`
      ).toBe(true);
    }
  });

  it("includes all trigger types", () => {
    const triggers = [
      "trigger_manual",
      "trigger_schedule",
      "trigger_webhook",
      "trigger_event",
    ];
    for (const trigger of triggers) {
      expect(SUPPORTED_NODE_TYPES.has(trigger)).toBe(true);
    }
  });

  it("includes AI node types", () => {
    const aiTypes = [
      "agent_call",
      "llm",
      "rag",
      "chunk",
      "summarize",
      "extract",
      "classify",
      "embeddings",
      "rerank",
    ];
    for (const type of aiTypes) {
      expect(SUPPORTED_NODE_TYPES.has(type)).toBe(true);
    }
  });
});

describe("ENTRY_NODE_TYPES", () => {
  it("contains exactly the expected entry types", () => {
    expect(ENTRY_NODE_TYPES.size).toBe(5);
    expect(ENTRY_NODE_TYPES.has("start")).toBe(true);
    expect(ENTRY_NODE_TYPES.has("trigger_manual")).toBe(true);
    expect(ENTRY_NODE_TYPES.has("trigger_schedule")).toBe(true);
    expect(ENTRY_NODE_TYPES.has("trigger_webhook")).toBe(true);
    expect(ENTRY_NODE_TYPES.has("trigger_event")).toBe(true);
  });
});
