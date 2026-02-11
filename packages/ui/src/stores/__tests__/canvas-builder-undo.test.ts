import { beforeEach, describe, expect, it } from "bun:test";
import { useCanvasBuilderStore } from "../canvas-builder-store";
import { useCanvasStore } from "../canvas-store";

function resetStores() {
  useCanvasBuilderStore.getState().reset();
  useCanvasStore.getState().reset();
}

describe("undoLastAiOperation", () => {
  beforeEach(resetStores);

  it("removes the last added node on undo", () => {
    const canvasStore = useCanvasStore.getState();
    const builderStore = useCanvasBuilderStore.getState();

    canvasStore.addNode({
      id: "ai-node-1",
      type: "llm",
      position: { x: 0, y: 0 },
      data: { label: "LLM" },
    });

    builderStore.applyOperation({
      type: "add_node",
      id: "ai-node-1",
      nodeType: "llm",
      label: "LLM",
      timestamp: Date.now(),
    });

    builderStore.undoLastAiOperation();

    expect(
      useCanvasStore.getState().nodes.find((n) => n.id === "ai-node-1")
    ).toBeUndefined();
    expect(useCanvasBuilderStore.getState().operationHistory).toHaveLength(0);
  });

  it("removes the last connected edge on undo", () => {
    const canvasStore = useCanvasStore.getState();
    const builderStore = useCanvasBuilderStore.getState();

    canvasStore.addNode({
      id: "n1",
      type: "llm",
      position: { x: 0, y: 0 },
      data: { label: "A" },
    });
    canvasStore.addNode({
      id: "n2",
      type: "llm",
      position: { x: 200, y: 0 },
      data: { label: "B" },
    });
    canvasStore.addEdge({ id: "e1", source: "n1", target: "n2" });

    builderStore.applyOperation({
      type: "connect",
      id: "e1",
      source: "n1",
      target: "n2",
      timestamp: Date.now(),
    });

    builderStore.undoLastAiOperation();

    expect(
      useCanvasStore.getState().edges.find((e) => e.id === "e1")
    ).toBeUndefined();
  });

  it("restores a removed node on undo when snapshot exists", () => {
    const canvasStore = useCanvasStore.getState();
    const builderStore = useCanvasBuilderStore.getState();

    const node = {
      id: "ai-node-2",
      type: "code",
      position: { x: 100, y: 100 },
      data: { label: "Code" },
    };

    canvasStore.addNode(node);

    builderStore.captureUndoSnapshot("op-remove-1", { node });
    builderStore.applyOperation({
      type: "remove_node",
      id: "op-remove-1",
      nodeId: "ai-node-2",
      timestamp: Date.now(),
    });

    canvasStore.removeNode("ai-node-2");
    expect(
      useCanvasStore.getState().nodes.find((n) => n.id === "ai-node-2")
    ).toBeUndefined();

    builderStore.undoLastAiOperation();

    const restored = useCanvasStore
      .getState()
      .nodes.find((n) => n.id === "ai-node-2");
    expect(restored).toBeDefined();
    expect((restored?.data as { label: string }).label).toBe("Code");
  });

  it("restores a disconnected edge on undo when snapshot exists", () => {
    const canvasStore = useCanvasStore.getState();
    const builderStore = useCanvasBuilderStore.getState();

    canvasStore.addNode({
      id: "n1",
      type: "llm",
      position: { x: 0, y: 0 },
      data: { label: "A" },
    });
    canvasStore.addNode({
      id: "n2",
      type: "llm",
      position: { x: 200, y: 0 },
      data: { label: "B" },
    });

    const edge = { id: "e1", source: "n1", target: "n2" };
    canvasStore.addEdge(edge);

    builderStore.captureUndoSnapshot("op-disconnect-1", { edge });
    builderStore.applyOperation({
      type: "disconnect",
      id: "op-disconnect-1",
      edgeId: "e1",
      timestamp: Date.now(),
    });

    canvasStore.removeEdge("e1");

    builderStore.undoLastAiOperation();

    expect(
      useCanvasStore.getState().edges.find((e) => e.id === "e1")
    ).toBeDefined();
  });

  it("no-ops when operation history is empty", () => {
    const builderStore = useCanvasBuilderStore.getState();
    const nodesBefore = useCanvasStore.getState().nodes.length;

    builderStore.undoLastAiOperation();

    expect(useCanvasBuilderStore.getState().operationHistory).toHaveLength(0);
    expect(useCanvasStore.getState().nodes).toHaveLength(nodesBefore);
  });

  it("clears undo snapshots on clearHistory", () => {
    const builderStore = useCanvasBuilderStore.getState();

    builderStore.captureUndoSnapshot("op-1", {
      node: {
        id: "n1",
        type: "llm",
        position: { x: 0, y: 0 },
        data: { label: "LLM" },
      },
    });

    builderStore.clearHistory();

    expect(
      Object.keys(useCanvasBuilderStore.getState().undoSnapshots)
    ).toHaveLength(0);
  });

  it("undoes multiple operations in reverse order", () => {
    const canvasStore = useCanvasStore.getState();
    const builderStore = useCanvasBuilderStore.getState();

    canvasStore.addNode({
      id: "n1",
      type: "llm",
      position: { x: 0, y: 0 },
      data: { label: "First" },
    });
    builderStore.applyOperation({
      type: "add_node",
      id: "n1",
      nodeType: "llm",
      label: "First",
      timestamp: 1000,
    });

    canvasStore.addNode({
      id: "n2",
      type: "code",
      position: { x: 200, y: 0 },
      data: { label: "Second" },
    });
    builderStore.applyOperation({
      type: "add_node",
      id: "n2",
      nodeType: "code",
      label: "Second",
      timestamp: 2000,
    });

    builderStore.undoLastAiOperation();
    expect(
      useCanvasStore.getState().nodes.find((n) => n.id === "n2")
    ).toBeUndefined();
    expect(
      useCanvasStore.getState().nodes.find((n) => n.id === "n1")
    ).toBeDefined();

    builderStore.undoLastAiOperation();
    expect(
      useCanvasStore.getState().nodes.find((n) => n.id === "n1")
    ).toBeUndefined();
  });
});
