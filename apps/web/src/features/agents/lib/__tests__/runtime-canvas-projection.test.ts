import { beforeEach, describe, expect, it } from "bun:test";
import type {
  AgentCanvasNode,
  NodeStatus,
  RuntimeEvent,
} from "@openplane/types/canvas";
import {
  applyRuntimeCanvasOperation,
  buildExecutionOverlayFromRuntime,
} from "../runtime-canvas-projection";

function createRuntimeEvent(
  payloadOverride: RuntimeEvent["payload"],
  envelope?: Partial<RuntimeEvent>
): RuntimeEvent {
  return {
    eventId: `evt-${Date.now()}`,
    sequence: 1,
    timestamp: Date.now(),
    canvasId: "canvas-1",
    sessionId: "sess-1",
    source: "agent",
    visibility: "visible",
    ...envelope,
    payload: payloadOverride,
  };
}

function createMockStore() {
  const nodes: AgentCanvasNode[] = [];
  const edges: { id: string; source: string; target: string }[] = [];
  const updatedConfigs: { id: string; data: Record<string, unknown> }[] = [];

  return {
    nodes,
    edges,
    updatedConfigs,
    addNode: (node: AgentCanvasNode) => nodes.push(node),
    addEdge: (edge: { id: string; source: string; target: string }) =>
      edges.push(edge),
    removeNode: (id: string) => {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx >= 0) {
        nodes.splice(idx, 1);
      }
    },
    removeEdge: (id: string) => {
      const idx = edges.findIndex((e) => e.id === id);
      if (idx >= 0) {
        edges.splice(idx, 1);
      }
    },
    updateNodeData: (id: string, data: Record<string, unknown>) =>
      updatedConfigs.push({ id, data }),
  };
}

describe("applyRuntimeCanvasOperation", () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  it("adds a node from add_node operation", () => {
    const event = createRuntimeEvent({
      type: "canvas.op_applied",
      operation: {
        type: "add_node",
        id: "node-1",
        nodeType: "llm",
        position: { x: 100, y: 200 },
        label: "LLM Node",
        timestamp: Date.now(),
      },
    });

    applyRuntimeCanvasOperation(store, event);

    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].id).toBe("node-1");
    expect(store.nodes[0].type).toBe("llm");
    expect(store.nodes[0].position).toEqual({ x: 100, y: 200 });
    expect((store.nodes[0].data as { label: string }).label).toBe("LLM Node");
  });

  it("defaults position to origin when omitted", () => {
    const event = createRuntimeEvent({
      type: "canvas.op_applied",
      operation: {
        type: "add_node",
        id: "node-2",
        nodeType: "code",
        timestamp: Date.now(),
      },
    });

    applyRuntimeCanvasOperation(store, event);

    expect(store.nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it("adds an edge from connect operation", () => {
    const event = createRuntimeEvent({
      type: "canvas.op_applied",
      operation: {
        type: "connect",
        id: "edge-1",
        source: "node-a",
        target: "node-b",
        sourceHandle: "out-1",
        targetHandle: "in-1",
        timestamp: Date.now(),
      },
    });

    applyRuntimeCanvasOperation(store, event);

    expect(store.edges).toHaveLength(1);
    expect(store.edges[0]).toMatchObject({
      id: "edge-1",
      source: "node-a",
      target: "node-b",
    });
  });

  it("removes a node from remove_node operation", () => {
    store.addNode({
      id: "node-x",
      type: "llm",
      position: { x: 0, y: 0 },
      data: {},
    });

    const event = createRuntimeEvent({
      type: "canvas.op_applied",
      operation: {
        type: "remove_node",
        id: "op-rm-1",
        nodeId: "node-x",
        timestamp: Date.now(),
      },
    });

    applyRuntimeCanvasOperation(store, event);

    expect(store.nodes).toHaveLength(0);
  });

  it("removes an edge from disconnect operation", () => {
    store.addEdge({ id: "edge-x", source: "a", target: "b" });

    const event = createRuntimeEvent({
      type: "canvas.op_applied",
      operation: {
        type: "disconnect",
        id: "op-dc-1",
        edgeId: "edge-x",
        timestamp: Date.now(),
      },
    });

    applyRuntimeCanvasOperation(store, event);

    expect(store.edges).toHaveLength(0);
  });

  it("applies update_config operation", () => {
    const event = createRuntimeEvent({
      type: "canvas.op_applied",
      operation: {
        type: "update_config",
        id: "op-cfg-1",
        nodeId: "node-cfg",
        config: { temperature: 0.7 },
        timestamp: Date.now(),
      },
    });

    applyRuntimeCanvasOperation(store, event);

    expect(store.updatedConfigs).toHaveLength(1);
    expect(store.updatedConfigs[0]).toEqual({
      id: "node-cfg",
      data: { temperature: 0.7 },
    });
  });

  it("ignores non-canvas events", () => {
    const chatEvent = createRuntimeEvent({
      type: "chat.assistant_delta",
      chunk: "hello",
    });

    applyRuntimeCanvasOperation(store, chatEvent);

    expect(store.nodes).toHaveLength(0);
    expect(store.edges).toHaveLength(0);
  });

  it("ignores tool events", () => {
    const toolEvent = createRuntimeEvent({
      type: "tool.call_start",
      toolCallId: "tc-1",
      toolName: "add_node",
    });

    applyRuntimeCanvasOperation(store, toolEvent);

    expect(store.nodes).toHaveLength(0);
  });
});

describe("buildExecutionOverlayFromRuntime", () => {
  const nodes: AgentCanvasNode[] = [
    { id: "n1", type: "llm", position: { x: 0, y: 0 }, data: { label: "LLM" } },
    {
      id: "n2",
      type: "code",
      position: { x: 200, y: 0 },
      data: { label: "Code" },
    },
    {
      id: "n3",
      type: "end",
      position: { x: 400, y: 0 },
      data: { label: "End" },
    },
  ];

  it("returns empty object when nodeStatusMap is undefined", () => {
    const result = buildExecutionOverlayFromRuntime(
      undefined,
      undefined,
      nodes
    );
    expect(result).toEqual({});
  });

  it("identifies the running node label", () => {
    const statusMap: Record<string, NodeStatus> = {
      n1: "success",
      n2: "running",
      n3: "idle",
    };

    const result = buildExecutionOverlayFromRuntime(
      statusMap,
      undefined,
      nodes
    );

    expect(result.currentNodeLabel).toBe("Code");
  });

  it("calculates progress from completed nodes", () => {
    const statusMap: Record<string, NodeStatus> = {
      n1: "success",
      n2: "error",
      n3: "idle",
    };

    const result = buildExecutionOverlayFromRuntime(
      statusMap,
      undefined,
      nodes
    );

    expect(result.progress).toEqual({
      value: 2 / 3,
      label: "2/3 nodes",
    });
  });

  it("returns zero progress when all nodes are idle", () => {
    const statusMap: Record<string, NodeStatus> = {
      n1: "idle",
      n2: "idle",
    };

    const result = buildExecutionOverlayFromRuntime(
      statusMap,
      undefined,
      nodes
    );

    expect(result.progress).toEqual({
      value: 0,
      label: "0/2 nodes",
    });
  });

  it("passes through edge state map", () => {
    const statusMap: Record<string, NodeStatus> = { n1: "running" };
    const edgeMap = { e1: "running" as const };

    const result = buildExecutionOverlayFromRuntime(statusMap, edgeMap, nodes);

    expect(result.edgeStateMap).toBe(edgeMap);
  });

  it("handles no running node gracefully", () => {
    const statusMap: Record<string, NodeStatus> = {
      n1: "success",
      n2: "success",
      n3: "success",
    };

    const result = buildExecutionOverlayFromRuntime(
      statusMap,
      undefined,
      nodes
    );

    expect(result.currentNodeLabel).toBeUndefined();
    expect(result.progress).toEqual({
      value: 1,
      label: "3/3 nodes",
    });
  });
});
