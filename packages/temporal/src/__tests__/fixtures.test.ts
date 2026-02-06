import { describe, expect, it } from "vitest";
import {
  createBaseNode,
  createConditionNode,
  createLinearCanvas,
  createLoopNode,
  createParallelSplitNode,
} from "./fixtures";

describe("Canvas Fixtures", () => {
  it("createBaseNode creates node with type", () => {
    const node = createBaseNode("transform");
    expect(node.type).toBe("transform");
    expect(node.id).toContain("node-transform");
    expect(node.data).toEqual({});
    expect(node.inbound).toEqual([]);
    expect(node.outbound).toEqual([]);
  });

  it("createBaseNode accepts overrides", () => {
    const node = createBaseNode("llm", {
      id: "custom-id",
      data: { model: "gpt-4" },
      inbound: ["input"],
    });
    expect(node.id).toBe("custom-id");
    expect(node.data).toEqual({ model: "gpt-4" });
    expect(node.inbound).toEqual(["input"]);
  });

  it("createLinearCanvas creates connected nodes", () => {
    const canvas = createLinearCanvas(["start", "transform", "end"]);
    expect(canvas.nodes).toHaveLength(3);
    expect(canvas.edges).toHaveLength(2);
    expect(canvas.nodes[0]?.type).toBe("start");
    expect(canvas.nodes[1]?.type).toBe("transform");
    expect(canvas.nodes[2]?.type).toBe("end");
    expect(canvas.nodes[0]?.position).toEqual({ x: 0, y: 100 });
  });

  it("createConditionNode has branches in outbound", () => {
    const node = createConditionNode([
      { id: "branch-a", condition: "x > 5" },
      { id: "branch-b", condition: "x <= 5" },
    ]);
    expect(node.type).toBe("condition");
    expect(node.outbound).toEqual(["branch-a", "branch-b"]);
  });

  it("createLoopNode has config", () => {
    const node = createLoopNode({ maxIterations: 10, condition: "count < 10" });
    expect(node.type).toBe("loop");
    expect(node.data).toHaveProperty("config");
  });

  it("createParallelSplitNode creates branches", () => {
    const node = createParallelSplitNode(3);
    expect(node.type).toBe("parallel_split");
    expect(node.outbound).toHaveLength(3);
    expect(node.outbound).toEqual(["branch-0", "branch-1", "branch-2"]);
  });
});
