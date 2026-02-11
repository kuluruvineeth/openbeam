import { describe, expect, it } from "bun:test";
import type { Node } from "@xyflow/react";

function createNode(id: string, overrides: Partial<Node> = {}): Node {
  return {
    id,
    type: "default",
    position: { x: 0, y: 0 },
    data: {},
    ...overrides,
  };
}

function groupNodes(
  nodes: Node[],
  selectedIds: string[],
  bounds: { x: number; y: number; width: number; height: number },
  groupId: string
): Node[] {
  const padding = 20;
  const groupNode: Node = {
    id: groupId,
    type: "group",
    position: { x: bounds.x - padding, y: bounds.y - padding },
    style: {
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
    },
    data: { label: "Group", expanded: true },
  };
  return [
    groupNode,
    ...nodes.map((n) => {
      if (!selectedIds.includes(n.id)) {
        return n;
      }
      return {
        ...n,
        parentId: groupId,
        extent: "parent" as const,
        position: {
          x: n.position.x - groupNode.position.x,
          y: n.position.y - groupNode.position.y,
        },
      };
    }),
  ];
}

function ungroupNodes(nodes: Node[], groupIdsToRemove: Set<string>): Node[] {
  const groupPositions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    if (groupIdsToRemove.has(n.id)) {
      groupPositions.set(n.id, n.position);
    }
  }
  return nodes
    .filter((n) => !groupIdsToRemove.has(n.id))
    .map((n) => {
      if (!(n.parentId && groupIdsToRemove.has(n.parentId))) {
        return n;
      }
      const parentPos = groupPositions.get(n.parentId);
      if (!parentPos) {
        return n;
      }
      return {
        ...n,
        parentId: undefined,
        extent: undefined,
        position: {
          x: n.position.x + parentPos.x,
          y: n.position.y + parentPos.y,
        },
      };
    });
}

describe("groupNodes", () => {
  const bounds = { x: 100, y: 200, width: 300, height: 150 };

  it("produces a result containing the group node plus all original nodes", () => {
    const nodes = [
      createNode("A", { position: { x: 120, y: 220 } }),
      createNode("B", { position: { x: 350, y: 300 } }),
    ];
    const result = groupNodes(nodes, ["A", "B"], bounds, "g1");
    expect(result).toHaveLength(3);
  });

  it("places the group node first in the array", () => {
    const nodes = [
      createNode("A", { position: { x: 120, y: 220 } }),
      createNode("B", { position: { x: 350, y: 300 } }),
    ];
    const result = groupNodes(nodes, ["A", "B"], bounds, "g1");
    expect(result[0].id).toBe("g1");
    expect(result[0].type).toBe("group");
  });

  it("positions the group node at bounds minus 20 padding", () => {
    const nodes = [createNode("A", { position: { x: 120, y: 220 } })];
    const result = groupNodes(nodes, ["A"], bounds, "g1");
    expect(result[0].position).toEqual({ x: 80, y: 180 });
  });

  it("sets group node style with bounds plus 40 total padding", () => {
    const nodes = [createNode("A", { position: { x: 120, y: 220 } })];
    const result = groupNodes(nodes, ["A"], bounds, "g1");
    expect(result[0].style).toEqual({ width: 340, height: 190 });
  });

  it("sets group node type and data correctly", () => {
    const nodes = [createNode("A", { position: { x: 120, y: 220 } })];
    const result = groupNodes(nodes, ["A"], bounds, "g1");
    const group = result[0];
    expect(group.type).toBe("group");
    expect(group.data).toEqual({ label: "Group", expanded: true });
  });

  it("converts selected child positions to be relative to the group", () => {
    const nodes = [
      createNode("A", { position: { x: 120, y: 220 } }),
      createNode("B", { position: { x: 350, y: 300 } }),
    ];
    const result = groupNodes(nodes, ["A", "B"], bounds, "g1");
    const childA = result.find((n) => n.id === "A");
    const childB = result.find((n) => n.id === "B");
    expect(childA?.position).toEqual({ x: 40, y: 40 });
    expect(childB?.position).toEqual({ x: 270, y: 120 });
  });

  it("assigns parentId and extent to selected children", () => {
    const nodes = [createNode("A", { position: { x: 120, y: 220 } })];
    const result = groupNodes(nodes, ["A"], bounds, "g1");
    const child = result.find((n) => n.id === "A");
    expect(child?.parentId).toBe("g1");
    expect(child?.extent).toBe("parent");
  });

  it("leaves unselected nodes unchanged", () => {
    const nodes = [
      createNode("A", { position: { x: 120, y: 220 } }),
      createNode("C", { position: { x: 500, y: 500 }, type: "llm" }),
    ];
    const result = groupNodes(nodes, ["A"], bounds, "g1");
    const unchanged = result.find((n) => n.id === "C");
    expect(unchanged?.position).toEqual({ x: 500, y: 500 });
    expect(unchanged?.parentId).toBeUndefined();
    expect(unchanged?.type).toBe("llm");
  });

  it("preserves original node data on selected children", () => {
    const nodes = [
      createNode("A", {
        position: { x: 120, y: 220 },
        data: { label: "Node A" },
      }),
    ];
    const result = groupNodes(nodes, ["A"], bounds, "g1");
    const child = result.find((n) => n.id === "A");
    expect(child?.data).toEqual({ label: "Node A" });
  });
});

describe("ungroupNodes", () => {
  it("removes the group node from the result", () => {
    const nodes = [
      createNode("g1", { position: { x: 80, y: 180 }, type: "group" }),
      createNode("A", { position: { x: 40, y: 40 }, parentId: "g1" }),
      createNode("B", { position: { x: 270, y: 120 }, parentId: "g1" }),
    ];
    const result = ungroupNodes(nodes, new Set(["g1"]));
    expect(result.find((n) => n.id === "g1")).toBeUndefined();
    expect(result).toHaveLength(2);
  });

  it("restores children to absolute positions", () => {
    const nodes = [
      createNode("g1", { position: { x: 80, y: 180 }, type: "group" }),
      createNode("A", { position: { x: 40, y: 40 }, parentId: "g1" }),
      createNode("B", { position: { x: 270, y: 120 }, parentId: "g1" }),
    ];
    const result = ungroupNodes(nodes, new Set(["g1"]));
    const childA = result.find((n) => n.id === "A");
    const childB = result.find((n) => n.id === "B");
    expect(childA?.position).toEqual({ x: 120, y: 220 });
    expect(childB?.position).toEqual({ x: 350, y: 300 });
  });

  it("clears parentId and extent on ungrouped children", () => {
    const nodes = [
      createNode("g1", { position: { x: 80, y: 180 }, type: "group" }),
      createNode("A", {
        position: { x: 40, y: 40 },
        parentId: "g1",
        extent: "parent" as const,
      }),
    ];
    const result = ungroupNodes(nodes, new Set(["g1"]));
    const child = result.find((n) => n.id === "A");
    expect(child?.parentId).toBeUndefined();
    expect(child?.extent).toBeUndefined();
  });

  it("leaves non-grouped nodes unchanged", () => {
    const nodes = [
      createNode("g1", { position: { x: 80, y: 180 }, type: "group" }),
      createNode("A", { position: { x: 40, y: 40 }, parentId: "g1" }),
      createNode("C", { position: { x: 500, y: 500 }, type: "llm" }),
    ];
    const result = ungroupNodes(nodes, new Set(["g1"]));
    const unchanged = result.find((n) => n.id === "C");
    expect(unchanged?.position).toEqual({ x: 500, y: 500 });
    expect(unchanged?.type).toBe("llm");
    expect(unchanged?.parentId).toBeUndefined();
  });

  it("ungroups multiple groups simultaneously", () => {
    const nodes = [
      createNode("g1", { position: { x: 10, y: 20 }, type: "group" }),
      createNode("g2", { position: { x: 300, y: 400 }, type: "group" }),
      createNode("A", { position: { x: 5, y: 5 }, parentId: "g1" }),
      createNode("B", { position: { x: 50, y: 60 }, parentId: "g2" }),
      createNode("C", { position: { x: 999, y: 999 } }),
    ];
    const result = ungroupNodes(nodes, new Set(["g1", "g2"]));
    expect(result).toHaveLength(3);
    expect(result.find((n) => n.id === "g1")).toBeUndefined();
    expect(result.find((n) => n.id === "g2")).toBeUndefined();
    expect(result.find((n) => n.id === "A")?.position).toEqual({
      x: 15,
      y: 25,
    });
    expect(result.find((n) => n.id === "B")?.position).toEqual({
      x: 350,
      y: 460,
    });
  });

  it("returns children unchanged when parent position is missing from map", () => {
    const nodes = [
      createNode("A", { position: { x: 40, y: 40 }, parentId: "missing" }),
    ];
    const result = ungroupNodes(nodes, new Set(["missing"]));
    const child = result.find((n) => n.id === "A");
    expect(child?.position).toEqual({ x: 40, y: 40 });
    expect(child?.parentId).toBe("missing");
  });
});
