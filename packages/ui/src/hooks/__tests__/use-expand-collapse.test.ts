import { describe, expect, it } from "bun:test";
import type { Node } from "@xyflow/react";

function createNode(
  id: string,
  opts: { parentId?: string; expanded?: boolean } = {}
): Node {
  return {
    id,
    type: "default",
    position: { x: 0, y: 0 },
    parentId: opts.parentId,
    data: { expanded: opts.expanded },
  };
}

function getVisibleNodes(nodes: Node[]): Node[] {
  const visible = new Set<string>();
  const queue = nodes.filter((n) => !n.parentId);

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) {
      break;
    }
    visible.add(node.id);
    if (node.data.expanded !== false) {
      const children = nodes.filter((n) => n.parentId === node.id);
      queue.push(...children);
    }
  }

  return nodes.filter((n) => visible.has(n.id));
}

describe("getVisibleNodes", () => {
  it("returns empty array for empty input", () => {
    expect(getVisibleNodes([])).toEqual([]);
  });

  it("returns all root nodes when none have parents", () => {
    const nodes = [createNode("a"), createNode("b"), createNode("c")];
    expect(getVisibleNodes(nodes)).toEqual(nodes);
  });

  it("shows children when parent is expanded", () => {
    const nodes = [
      createNode("root", { expanded: true }),
      createNode("child-1", { parentId: "root" }),
      createNode("child-2", { parentId: "root" }),
    ];
    const result = getVisibleNodes(nodes);
    expect(result).toHaveLength(3);
    expect(result.map((n) => n.id)).toEqual(["root", "child-1", "child-2"]);
  });

  it("hides children when parent is collapsed", () => {
    const nodes = [
      createNode("root", { expanded: false }),
      createNode("child-1", { parentId: "root" }),
      createNode("child-2", { parentId: "root" }),
    ];
    const result = getVisibleNodes(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("root");
  });

  it("shows all nodes in a 3-level tree when all expanded", () => {
    const nodes = [
      createNode("root", { expanded: true }),
      createNode("child", { parentId: "root", expanded: true }),
      createNode("grandchild", { parentId: "child" }),
    ];
    const result = getVisibleNodes(nodes);
    expect(result).toHaveLength(3);
    expect(result.map((n) => n.id)).toEqual(["root", "child", "grandchild"]);
  });

  it("hides grandchildren when middle level is collapsed", () => {
    const nodes = [
      createNode("root", { expanded: true }),
      createNode("child", { parentId: "root", expanded: false }),
      createNode("grandchild", { parentId: "child" }),
    ];
    const result = getVisibleNodes(nodes);
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toEqual(["root", "child"]);
  });

  it("handles multiple roots with mixed expansion states", () => {
    const nodes = [
      createNode("root-a", { expanded: true }),
      createNode("child-a", { parentId: "root-a" }),
      createNode("root-b", { expanded: false }),
      createNode("child-b", { parentId: "root-b" }),
    ];
    const result = getVisibleNodes(nodes);
    expect(result).toHaveLength(3);
    expect(result.map((n) => n.id)).toEqual(["root-a", "child-a", "root-b"]);
  });

  it("excludes orphan nodes whose parent does not exist", () => {
    const nodes = [
      createNode("root"),
      createNode("orphan", { parentId: "nonexistent" }),
    ];
    const result = getVisibleNodes(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("root");
  });

  it("treats missing expanded field as expanded (default behavior)", () => {
    const root = createNode("root");
    const child = createNode("child", { parentId: "root" });
    expect(root.data.expanded).toBeUndefined();

    const result = getVisibleNodes([root, child]);
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toEqual(["root", "child"]);
  });

  it("hides all children when parent with multiple children is collapsed", () => {
    const nodes = [
      createNode("parent", { expanded: false }),
      createNode("c1", { parentId: "parent" }),
      createNode("c2", { parentId: "parent" }),
      createNode("c3", { parentId: "parent" }),
      createNode("c4", { parentId: "parent" }),
    ];
    const result = getVisibleNodes(nodes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("parent");
  });

  it("handles complex tree with mixed expansion across branches", () => {
    const nodes = [
      createNode("root", { expanded: true }),
      createNode("branch-a", { parentId: "root", expanded: true }),
      createNode("leaf-a1", { parentId: "branch-a" }),
      createNode("leaf-a2", { parentId: "branch-a" }),
      createNode("branch-b", { parentId: "root", expanded: false }),
      createNode("leaf-b1", { parentId: "branch-b" }),
      createNode("branch-c", { parentId: "root", expanded: true }),
      createNode("leaf-c1", { parentId: "branch-c" }),
    ];
    const result = getVisibleNodes(nodes);
    const ids = result.map((n) => n.id);
    expect(ids).toEqual([
      "root",
      "branch-a",
      "leaf-a1",
      "leaf-a2",
      "branch-b",
      "branch-c",
      "leaf-c1",
    ]);
    expect(ids).not.toContain("leaf-b1");
  });

  it("preserves original node references in output", () => {
    const root = createNode("root", { expanded: true });
    const child = createNode("child", { parentId: "root" });
    const result = getVisibleNodes([root, child]);
    expect(result[0]).toBe(root);
    expect(result[1]).toBe(child);
  });
});
