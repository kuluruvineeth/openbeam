import { beforeEach, describe, expect, it } from "bun:test";
import type { AgentCanvasEdge, AgentCanvasNode } from "@openplane/types/canvas";
import {
  createCanvasStore,
  useCanvasEdges,
  useCanvasId,
  useCanvasIsDirty,
  useCanvasIsHydrated,
  useCanvasNodes,
  useCanvasSelection,
  useCanvasStore,
  useCanvasViewport,
  useIsActionPanelDocked,
} from "../canvas-store";

function createNode(id: string, type = "llm"): AgentCanvasNode {
  return { id, type, position: { x: 0, y: 0 }, data: { label: id } };
}

function createEdge(
  id: string,
  source: string,
  target: string
): AgentCanvasEdge {
  return { id, source, target, type: "data" };
}

describe("canvas-store", () => {
  const useStore = createCanvasStore({ storage: "memory" });

  beforeEach(() => {
    useStore.getState().reset();
  });

  describe("CRUD operations", () => {
    it("adds a node and sets isDirty", () => {
      const node = createNode("n1");
      useStore.getState().addNode(node);

      expect(useStore.getState().nodes).toHaveLength(1);
      expect(useStore.getState().nodes[0]?.id).toBe("n1");
      expect(useStore.getState().isDirty).toBe(true);
    });

    it("removes a node and connected edges", () => {
      const n1 = createNode("n1");
      const n2 = createNode("n2");
      const n3 = createNode("n3");
      const e1 = createEdge("e1", "n1", "n2");
      const e2 = createEdge("e2", "n2", "n3");
      const e3 = createEdge("e3", "n3", "n1");

      const state = useStore.getState();
      state.addNode(n1);
      state.addNode(n2);
      state.addNode(n3);
      state.addEdge(e1);
      state.addEdge(e2);
      state.addEdge(e3);

      useStore.getState().removeNode("n1");

      expect(useStore.getState().nodes).toHaveLength(2);
      expect(useStore.getState().nodes.map((n) => n.id)).toEqual(["n2", "n3"]);
      expect(useStore.getState().edges).toHaveLength(1);
      expect(useStore.getState().edges[0]?.id).toBe("e2");
    });

    it("updates node data by merging", () => {
      const node = createNode("n1");
      useStore.getState().addNode(node);

      useStore.getState().updateNode("n1", { temperature: 0.7 });

      const updated = useStore.getState().nodes[0];
      expect((updated?.data as Record<string, unknown>).label).toBe("n1");
      expect((updated?.data as Record<string, unknown>).temperature).toBe(0.7);
      expect(useStore.getState().isDirty).toBe(true);
    });

    it("adds an edge and sets isDirty", () => {
      const edge = createEdge("e1", "n1", "n2");
      useStore.getState().addEdge(edge);

      expect(useStore.getState().edges).toHaveLength(1);
      expect(useStore.getState().edges[0]?.id).toBe("e1");
      expect(useStore.getState().isDirty).toBe(true);
    });

    it("removes a specific edge", () => {
      const e1 = createEdge("e1", "n1", "n2");
      const e2 = createEdge("e2", "n2", "n3");
      useStore.getState().addEdge(e1);
      useStore.getState().addEdge(e2);

      useStore.getState().removeEdge("e1");

      expect(useStore.getState().edges).toHaveLength(1);
      expect(useStore.getState().edges[0]?.id).toBe("e2");
    });

    it("replaces all nodes with setNodes", () => {
      useStore.getState().addNode(createNode("old"));

      const replacements = [createNode("a"), createNode("b")];
      useStore.getState().setNodes(replacements);

      expect(useStore.getState().nodes).toHaveLength(2);
      expect(useStore.getState().nodes.map((n) => n.id)).toEqual(["a", "b"]);
      expect(useStore.getState().isDirty).toBe(true);
    });

    it("replaces all edges with setEdges", () => {
      useStore.getState().addEdge(createEdge("old", "a", "b"));

      const replacements = [
        createEdge("e1", "x", "y"),
        createEdge("e2", "y", "z"),
      ];
      useStore.getState().setEdges(replacements);

      expect(useStore.getState().edges).toHaveLength(2);
      expect(useStore.getState().edges.map((e) => e.id)).toEqual(["e1", "e2"]);
      expect(useStore.getState().isDirty).toBe(true);
    });
  });

  describe("undo/redo", () => {
    it("undo after addNode restores previous state", () => {
      useStore.getState().addNode(createNode("n1"));
      expect(useStore.getState().nodes).toHaveLength(1);

      useStore.temporal.getState().undo();

      expect(useStore.getState().nodes).toHaveLength(0);
    });

    it("redo after undo re-applies the add", () => {
      useStore.getState().addNode(createNode("n1"));
      useStore.temporal.getState().undo();

      expect(useStore.getState().nodes).toHaveLength(0);

      useStore.temporal.getState().redo();

      expect(useStore.getState().nodes).toHaveLength(1);
      expect(useStore.getState().nodes[0]?.id).toBe("n1");
    });

    it("multiple operations create multiple undo states", () => {
      useStore.getState().addNode(createNode("n1"));
      useStore.getState().addNode(createNode("n2"));
      useStore.getState().addNode(createNode("n3"));

      expect(useStore.getState().nodes).toHaveLength(3);

      useStore.temporal.getState().undo();
      expect(useStore.getState().nodes).toHaveLength(2);

      useStore.temporal.getState().undo();
      expect(useStore.getState().nodes).toHaveLength(1);

      useStore.temporal.getState().undo();
      expect(useStore.getState().nodes).toHaveLength(0);
    });

    it("new action after undo clears future states", () => {
      useStore.getState().addNode(createNode("n1"));
      useStore.getState().addNode(createNode("n2"));

      useStore.temporal.getState().undo();
      expect(useStore.getState().nodes).toHaveLength(1);

      useStore.getState().addNode(createNode("n3"));
      expect(useStore.getState().nodes).toHaveLength(2);

      useStore.temporal.getState().redo();
      expect(useStore.getState().nodes).toHaveLength(2);
      expect(useStore.getState().nodes.map((n) => n.id)).toEqual(["n1", "n3"]);
    });

    it("only tracks nodes and edges, not viewport or selection", () => {
      useStore.getState().addNode(createNode("n1"));

      useStore.getState().setViewport({ x: 999, y: 999, zoom: 5 });
      useStore.getState().setSelection({ nodes: ["n1"], edges: [] });

      useStore.temporal.getState().undo();

      expect(useStore.getState().nodes).toHaveLength(0);
      expect(useStore.getState().viewport).toEqual({ x: 999, y: 999, zoom: 5 });
      expect(useStore.getState().selection).toEqual({
        nodes: ["n1"],
        edges: [],
      });
    });

    it("respects history limit of 50", () => {
      for (let i = 0; i < 60; i++) {
        useStore.getState().addNode(createNode(`n${i}`));
      }

      const pastStates = useStore.temporal.getState().pastStates;
      expect(pastStates.length).toBeLessThanOrEqual(50);
    });
  });

  describe("canvas lifecycle", () => {
    it("loadCanvas sets nodes, edges, viewport and clears isDirty", () => {
      useStore.getState().addNode(createNode("dirty"));
      expect(useStore.getState().isDirty).toBe(true);

      const nodes = [createNode("a"), createNode("b")];
      const edges = [createEdge("e1", "a", "b")];
      const viewport = { x: 100, y: 200, zoom: 1.5 };

      useStore.getState().loadCanvas(nodes, edges, viewport);

      expect(useStore.getState().nodes).toHaveLength(2);
      expect(useStore.getState().edges).toHaveLength(1);
      expect(useStore.getState().viewport).toEqual(viewport);
      expect(useStore.getState().isDirty).toBe(false);
    });

    it("markClean sets isDirty to false", () => {
      useStore.getState().addNode(createNode("n1"));
      expect(useStore.getState().isDirty).toBe(true);

      useStore.getState().markClean();
      expect(useStore.getState().isDirty).toBe(false);
    });

    it("reset returns to initial empty state", () => {
      const state = useStore.getState();
      state.addNode(createNode("n1"));
      state.addEdge(createEdge("e1", "n1", "n2"));
      state.setCanvasId("canvas-1");
      state.setViewport({ x: 10, y: 20, zoom: 2 });

      useStore.getState().reset();

      expect(useStore.getState().nodes).toHaveLength(0);
      expect(useStore.getState().edges).toHaveLength(0);
      expect(useStore.getState().canvasId).toBeNull();
      expect(useStore.getState().isDirty).toBe(false);
      expect(useStore.getState().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it("hydrate merges state and sets isHydrated", () => {
      useStore.getState().hydrate({
        viewport: { x: 50, y: 50, zoom: 2 },
        isActionPanelDocked: true,
      });

      expect(useStore.getState().viewport).toEqual({ x: 50, y: 50, zoom: 2 });
      expect(useStore.getState().isActionPanelDocked).toBe(true);
      expect(useStore.getState().isHydrated).toBe(true);
    });

    it("setCanvasId updates canvasId", () => {
      useStore.getState().setCanvasId("canvas-42");
      expect(useStore.getState().canvasId).toBe("canvas-42");

      useStore.getState().setCanvasId(null);
      expect(useStore.getState().canvasId).toBeNull();
    });

    it("setViewport updates viewport without setting isDirty", () => {
      useStore.getState().setViewport({ x: 100, y: 200, zoom: 0.5 });

      expect(useStore.getState().viewport).toEqual({
        x: 100,
        y: 200,
        zoom: 0.5,
      });
      expect(useStore.getState().isDirty).toBe(false);
    });
  });

  describe("selection", () => {
    it("setSelection stores node and edge IDs", () => {
      useStore.getState().setSelection({ nodes: ["n1", "n2"], edges: ["e1"] });

      const selection = useStore.getState().selection;
      expect(selection.nodes).toEqual(["n1", "n2"]);
      expect(selection.edges).toEqual(["e1"]);
    });

    it("clearSelection resets to empty arrays", () => {
      useStore.getState().setSelection({ nodes: ["n1"], edges: ["e1"] });

      useStore.getState().clearSelection();

      const selection = useStore.getState().selection;
      expect(selection.nodes).toEqual([]);
      expect(selection.edges).toEqual([]);
    });

    it("setActionPanelDocked toggles the flag", () => {
      expect(useStore.getState().isActionPanelDocked).toBe(false);

      useStore.getState().setActionPanelDocked(true);
      expect(useStore.getState().isActionPanelDocked).toBe(true);

      useStore.getState().setActionPanelDocked(false);
      expect(useStore.getState().isActionPanelDocked).toBe(false);
    });
  });

  describe("selector hooks are exported as functions", () => {
    it("exports all selector hooks", () => {
      expect(typeof useCanvasNodes).toBe("function");
      expect(typeof useCanvasEdges).toBe("function");
      expect(typeof useCanvasViewport).toBe("function");
      expect(typeof useCanvasSelection).toBe("function");
      expect(typeof useCanvasId).toBe("function");
      expect(typeof useCanvasIsDirty).toBe("function");
      expect(typeof useCanvasIsHydrated).toBe("function");
      expect(typeof useIsActionPanelDocked).toBe("function");
    });

    it("global store exposes same API as factory store", () => {
      const globalKeys = Object.keys(useCanvasStore.getState());
      const factoryKeys = Object.keys(useStore.getState());

      for (const key of factoryKeys) {
        expect(globalKeys).toContain(key);
      }
    });
  });
});
