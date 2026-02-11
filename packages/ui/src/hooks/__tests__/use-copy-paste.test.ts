import { describe, expect, it } from "bun:test";
import type { Edge, Node } from "@xyflow/react";

function createNode(
  id: string,
  type = "llm",
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    type,
    position: { x: 100, y: 100 },
    data: {},
    selected: false,
    ...overrides,
  };
}

function createEdge(id: string, source: string, target: string): Edge {
  return { id, source, target, type: "data" };
}

const ID_COUNTER_LIMIT = 1_000_000;
let lastIdTimestamp = 0;
let idCounter = 0;

function createUniqueId(prefix: string): string {
  const timestamp = Date.now();
  if (timestamp !== lastIdTimestamp) {
    lastIdTimestamp = timestamp;
    idCounter = 0;
  } else {
    idCounter = (idCounter + 1) % ID_COUNTER_LIMIT;
  }
  return `${prefix}-${timestamp}-${idCounter}`;
}

function copySelected(nodes: Node[], edges: Edge[]) {
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedIds = new Set(selectedNodes.map((n) => n.id));
  const selectedEdges = edges.filter(
    (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
  );
  return { nodes: selectedNodes, edges: selectedEdges };
}

function pasteClipboard(
  clipboard: { nodes: Node[]; edges: Edge[] },
  existingNodes: Node[],
  existingEdges: Edge[],
  offset: number
) {
  const idMapping: Record<string, string> = {};

  const newNodes = clipboard.nodes.map((node) => {
    const newId = createUniqueId(node.type ?? "node");
    idMapping[node.id] = newId;
    return {
      ...node,
      id: newId,
      position: {
        x: node.position.x + offset,
        y: node.position.y + offset,
      },
      selected: true,
    };
  });

  const newEdges = clipboard.edges.map((edge) => ({
    ...edge,
    id: createUniqueId("edge"),
    source: idMapping[edge.source] ?? edge.source,
    target: idMapping[edge.target] ?? edge.target,
  }));

  const updatedNodes = [
    ...existingNodes.map((n) => ({ ...n, selected: false })),
    ...newNodes,
  ];
  const updatedEdges = [...existingEdges, ...newEdges];

  return { nodes: updatedNodes, edges: updatedEdges, idMapping };
}

function cutSelected(nodes: Node[], edges: Edge[]) {
  const clipboard = copySelected(nodes, edges);
  const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
  const remainingNodes = nodes.filter((n) => !selectedIds.has(n.id));
  const remainingEdges = edges.filter(
    (e) => !(selectedIds.has(e.source) || selectedIds.has(e.target))
  );
  return { clipboard, nodes: remainingNodes, edges: remainingEdges };
}

describe("createUniqueId", () => {
  it("generates IDs with the correct prefix", () => {
    const id = createUniqueId("llm");
    expect(id.startsWith("llm-")).toBe(true);
  });

  it("generates unique IDs on successive calls", () => {
    const id1 = createUniqueId("node");
    const id2 = createUniqueId("node");
    expect(id1).not.toBe(id2);
  });

  it("includes a timestamp component", () => {
    const before = Date.now();
    const id = createUniqueId("test");
    const parts = id.split("-");
    const ts = Number(parts[1]);
    expect(ts).toBeGreaterThanOrEqual(before);
  });
});

describe("copy", () => {
  it("captures selected nodes", () => {
    const nodes = [
      createNode("A", "llm", { selected: true }),
      createNode("B", "code", { selected: true }),
      createNode("C", "llm", { selected: false }),
    ];
    const clipboard = copySelected(nodes, []);
    expect(clipboard.nodes).toHaveLength(2);
    expect(clipboard.nodes.map((n) => n.id)).toEqual(["A", "B"]);
  });

  it("captures only internal edges between selected nodes", () => {
    const nodes = [
      createNode("A", "llm", { selected: true }),
      createNode("B", "code", { selected: true }),
      createNode("C", "llm", { selected: false }),
    ];
    const edges = [
      createEdge("e1", "A", "B"),
      createEdge("e2", "B", "C"),
      createEdge("e3", "C", "A"),
    ];
    const clipboard = copySelected(nodes, edges);
    expect(clipboard.edges).toHaveLength(1);
    expect(clipboard.edges[0].id).toBe("e1");
  });

  it("returns empty when no nodes are selected", () => {
    const nodes = [createNode("A"), createNode("B")];
    const clipboard = copySelected(nodes, []);
    expect(clipboard.nodes).toHaveLength(0);
    expect(clipboard.edges).toHaveLength(0);
  });
});

describe("paste", () => {
  it("creates new IDs distinct from originals", () => {
    const clipboard = {
      nodes: [createNode("A", "llm"), createNode("B", "code")],
      edges: [createEdge("e1", "A", "B")],
    };
    const result = pasteClipboard(clipboard, [], [], 20);
    const pastedIds = result.nodes.map((n) => n.id);
    expect(pastedIds).not.toContain("A");
    expect(pastedIds).not.toContain("B");
  });

  it("offsets positions by the given amount", () => {
    const clipboard = {
      nodes: [createNode("A", "llm", { position: { x: 50, y: 80 } })],
      edges: [],
    };
    const result = pasteClipboard(clipboard, [], [], 20);
    expect(result.nodes[0].position).toEqual({ x: 70, y: 100 });
  });

  it("remaps edge source and target to new node IDs", () => {
    const clipboard = {
      nodes: [createNode("A", "llm"), createNode("B", "code")],
      edges: [createEdge("e1", "A", "B")],
    };
    const result = pasteClipboard(clipboard, [], [], 20);
    const pastedEdge = result.edges[0];
    expect(pastedEdge.source).toBe(result.idMapping.A);
    expect(pastedEdge.target).toBe(result.idMapping.B);
    expect(pastedEdge.id).not.toBe("e1");
  });

  it("deselects original nodes after paste", () => {
    const existing = [
      createNode("X", "llm", { selected: true }),
      createNode("Y", "code", { selected: true }),
    ];
    const clipboard = {
      nodes: [createNode("A", "llm")],
      edges: [],
    };
    const result = pasteClipboard(clipboard, existing, [], 20);
    const originals = result.nodes.filter((n) => n.id === "X" || n.id === "Y");
    expect(originals.every((n) => n.selected === false)).toBe(true);
  });

  it("marks pasted nodes as selected", () => {
    const clipboard = {
      nodes: [createNode("A", "llm"), createNode("B", "code")],
      edges: [],
    };
    const result = pasteClipboard(clipboard, [], [], 20);
    expect(result.nodes.every((n) => n.selected === true)).toBe(true);
  });

  it("accumulates offset on successive pastes", () => {
    const clipboard = {
      nodes: [createNode("A", "llm", { position: { x: 0, y: 0 } })],
      edges: [],
    };
    const first = pasteClipboard(clipboard, [], [], 20);
    const second = pasteClipboard(clipboard, first.nodes, first.edges, 40);
    const lastNode = second.nodes.at(-1);
    expect(lastNode.position).toEqual({ x: 40, y: 40 });
  });
});

describe("cut", () => {
  it("removes selected nodes from the graph", () => {
    const nodes = [
      createNode("A", "llm", { selected: true }),
      createNode("B", "code", { selected: false }),
    ];
    const result = cutSelected(nodes, []);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("B");
  });

  it("removes edges connected to selected nodes", () => {
    const nodes = [
      createNode("A", "llm", { selected: true }),
      createNode("B", "code", { selected: false }),
      createNode("C", "llm", { selected: false }),
    ];
    const edges = [createEdge("e1", "A", "B"), createEdge("e2", "B", "C")];
    const result = cutSelected(nodes, edges);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe("e2");
  });

  it("stores cut nodes in clipboard", () => {
    const nodes = [
      createNode("A", "llm", { selected: true }),
      createNode("B", "code", { selected: true }),
      createNode("C", "llm", { selected: false }),
    ];
    const result = cutSelected(nodes, []);
    expect(result.clipboard.nodes).toHaveLength(2);
  });

  it("is a no-op when nothing is selected", () => {
    const nodes = [createNode("A"), createNode("B")];
    const edges = [createEdge("e1", "A", "B")];
    const result = cutSelected(nodes, edges);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.clipboard.nodes).toHaveLength(0);
  });
});

describe("paste from empty clipboard", () => {
  it("returns existing state unchanged", () => {
    const existing = [createNode("A"), createNode("B")];
    const existingEdges = [createEdge("e1", "A", "B")];
    const clipboard = { nodes: [] as Node[], edges: [] as Edge[] };
    const result = pasteClipboard(clipboard, existing, existingEdges, 20);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });
});
