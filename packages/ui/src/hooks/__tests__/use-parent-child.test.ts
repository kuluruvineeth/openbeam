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

function detachNode(nodes: Node[], nodeId: string): Node[] {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node?.parentId) {
    return nodes;
  }
  const parent = nodes.find((n) => n.id === node.parentId);
  if (!parent) {
    return nodes;
  }
  return nodes.map((n) => {
    if (n.id !== nodeId) {
      return n;
    }
    return {
      ...n,
      parentId: undefined,
      extent: undefined,
      position: {
        x: n.position.x + parent.position.x,
        y: n.position.y + parent.position.y,
      },
    };
  });
}

describe("detachNode", () => {
  it("computes absolute position from child and parent", () => {
    const nodes = [
      createNode("g1", { position: { x: 100, y: 200 }, type: "group" }),
      createNode("A", {
        position: { x: 30, y: 40 },
        parentId: "g1",
        extent: "parent" as const,
      }),
    ];
    const result = detachNode(nodes, "A");
    const detached = result.find((n) => n.id === "A");
    expect(detached?.position).toEqual({ x: 130, y: 240 });
  });

  it("removes parentId and extent from the detached node", () => {
    const nodes = [
      createNode("g1", { position: { x: 100, y: 200 }, type: "group" }),
      createNode("A", {
        position: { x: 30, y: 40 },
        parentId: "g1",
        extent: "parent" as const,
      }),
    ];
    const result = detachNode(nodes, "A");
    const detached = result.find((n) => n.id === "A");
    expect(detached?.parentId).toBeUndefined();
    expect(detached?.extent).toBeUndefined();
  });

  it("returns the same array when node has no parentId", () => {
    const nodes = [
      createNode("A", { position: { x: 50, y: 60 } }),
      createNode("B", { position: { x: 70, y: 80 } }),
    ];
    const result = detachNode(nodes, "A");
    expect(result).toBe(nodes);
  });

  it("returns the same array when parent does not exist", () => {
    const nodes = [
      createNode("A", { position: { x: 30, y: 40 }, parentId: "missing" }),
    ];
    const result = detachNode(nodes, "A");
    expect(result).toBe(nodes);
  });

  it("leaves other nodes unchanged after detach", () => {
    const nodes = [
      createNode("g1", { position: { x: 100, y: 200 }, type: "group" }),
      createNode("A", { position: { x: 30, y: 40 }, parentId: "g1" }),
      createNode("B", { position: { x: 10, y: 20 }, parentId: "g1" }),
      createNode("C", { position: { x: 500, y: 600 } }),
    ];
    const result = detachNode(nodes, "A");
    const nodeB = result.find((n) => n.id === "B");
    const nodeC = result.find((n) => n.id === "C");
    expect(nodeB?.position).toEqual({ x: 10, y: 20 });
    expect(nodeB?.parentId).toBe("g1");
    expect(nodeC?.position).toEqual({ x: 500, y: 600 });
  });

  it("detaches a nested child using its immediate parent", () => {
    const nodes = [
      createNode("g1", { position: { x: 50, y: 50 }, type: "group" }),
      createNode("g2", {
        position: { x: 20, y: 20 },
        parentId: "g1",
        type: "group",
      }),
      createNode("A", { position: { x: 10, y: 10 }, parentId: "g2" }),
    ];
    const result = detachNode(nodes, "A");
    const detached = result.find((n) => n.id === "A");
    expect(detached?.position).toEqual({ x: 30, y: 30 });
    expect(detached?.parentId).toBeUndefined();
  });

  it("returns the same array when nodeId does not exist", () => {
    const nodes = [createNode("A", { position: { x: 10, y: 20 } })];
    const result = detachNode(nodes, "nonexistent");
    expect(result).toBe(nodes);
  });

  it("preserves node data after detach", () => {
    const nodes = [
      createNode("g1", { position: { x: 100, y: 200 }, type: "group" }),
      createNode("A", {
        position: { x: 30, y: 40 },
        parentId: "g1",
        data: { label: "My Node", config: { key: "val" } },
      }),
    ];
    const result = detachNode(nodes, "A");
    const detached = result.find((n) => n.id === "A");
    expect(detached?.data).toEqual({
      label: "My Node",
      config: { key: "val" },
    });
  });
});
