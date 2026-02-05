import { describe, expect, it } from "bun:test";
import type {
  AgentCanvasEdge,
  AgentCanvasNode,
  CanvasNodeType,
  CanvasState,
} from "@openplane/types/canvas";
import {
  CanvasValidationError,
  compileCanvasPlan,
  validateCanvasGraph,
} from "../engine/canvas-compiler";

function createNode(id: string, type: CanvasNodeType): AgentCanvasNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id },
  };
}

function createEdge(
  id: string,
  source: string,
  target: string
): AgentCanvasEdge {
  return {
    id,
    source,
    target,
    type: "data",
  };
}

function createState(
  nodes: AgentCanvasNode[],
  edges: AgentCanvasEdge[]
): CanvasState {
  return { nodes, edges };
}

describe("canvas compiler", () => {
  it("validates a simple start to end graph", () => {
    const nodes = [createNode("start", "start"), createNode("end", "end")];
    const edges = [createEdge("edge-1", "start", "end")];
    const result = validateCanvasGraph(createState(nodes, edges));

    expect(result.valid).toBe(true);
    expect(result.stats.startNodes).toBe(1);
    expect(result.stats.endNodes).toBe(1);
  });

  it("flags missing start node", () => {
    const nodes = [createNode("end", "end")];
    const result = validateCanvasGraph(createState(nodes, []));

    expect(result.valid).toBe(false);
    expect(result.issues).toContain(
      "Workflow must have a start or trigger node"
    );
  });

  it("compiles a plan with stable order", () => {
    const nodes = [createNode("start", "start"), createNode("end", "end")];
    const edges = [createEdge("edge-1", "start", "end")];
    const plan = compileCanvasPlan(createState(nodes, edges));

    expect(plan.startNodeId).toBe("start");
    expect(plan.endNodeIds).toEqual(["end"]);
    expect(plan.nodeOrder[0]).toBe("start");
  });

  it("throws on invalid graph", () => {
    const nodes = [createNode("node-1", "llm")];

    expect(() => compileCanvasPlan(createState(nodes, []))).toThrow(
      CanvasValidationError
    );
  });

  it("detects simple cycle A → B → A", () => {
    const nodes = [
      createNode("start", "start"),
      createNode("a", "llm"),
      createNode("b", "llm"),
      createNode("end", "end"),
    ];
    const edges = [
      createEdge("edge-1", "start", "a"),
      createEdge("edge-2", "a", "b"),
      createEdge("edge-3", "b", "a"),
      createEdge("edge-4", "b", "end"),
    ];
    const result = validateCanvasGraph(createState(nodes, edges));

    expect(result.valid).toBe(false);
    expect(result.stats.cycleCount).toBe(1);
    expect(
      result.issues.some((issue) => issue.includes("Cycle detected"))
    ).toBe(true);
  });

  it("detects longer cycle A → B → C → A", () => {
    const nodes = [
      createNode("start", "start"),
      createNode("a", "llm"),
      createNode("b", "llm"),
      createNode("c", "llm"),
      createNode("end", "end"),
    ];
    const edges = [
      createEdge("edge-1", "start", "a"),
      createEdge("edge-2", "a", "b"),
      createEdge("edge-3", "b", "c"),
      createEdge("edge-4", "c", "a"),
      createEdge("edge-5", "c", "end"),
    ];
    const result = validateCanvasGraph(createState(nodes, edges));

    expect(result.valid).toBe(false);
    expect(result.stats.cycleCount).toBeGreaterThanOrEqual(1);
    expect(
      result.issues.some((issue) => issue.includes("Cycle detected"))
    ).toBe(true);
  });

  it("passes for acyclic graph", () => {
    const nodes = [
      createNode("start", "start"),
      createNode("a", "llm"),
      createNode("b", "llm"),
      createNode("c", "llm"),
      createNode("end", "end"),
    ];
    const edges = [
      createEdge("edge-1", "start", "a"),
      createEdge("edge-2", "a", "b"),
      createEdge("edge-3", "b", "c"),
      createEdge("edge-4", "c", "end"),
    ];
    const result = validateCanvasGraph(createState(nodes, edges));

    expect(result.valid).toBe(true);
    expect(result.stats.cycleCount).toBe(0);
  });
});
