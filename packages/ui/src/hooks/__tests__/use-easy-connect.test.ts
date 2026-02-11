import { describe, expect, it } from "bun:test";
import type { Node } from "@xyflow/react";
import { computeValidTargets } from "../use-easy-connect";

function createNode(id: string, type: string): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {},
  };
}

describe("computeValidTargets", () => {
  const nodes: Node[] = [
    createNode("start-1", "trigger_manual"),
    createNode("action-1", "action"),
    createNode("action-2", "llm"),
    createNode("end-1", "end"),
  ];

  it("returns compatible nodes excluding the source", () => {
    const targets = computeValidTargets("action-1", "source", nodes);
    expect(targets).toContain("action-2");
    expect(targets).toContain("end-1");
    expect(targets).not.toContain("action-1");
  });

  it("excludes source-only types as targets when dragging from source handle", () => {
    const targets = computeValidTargets("action-1", "source", nodes);
    expect(targets).not.toContain("start-1");
  });

  it("allows valid sources when dragging from sink target handle", () => {
    const targets = computeValidTargets("end-1", "target", nodes);
    expect(targets).toContain("start-1");
    expect(targets).toContain("action-1");
    expect(targets).toContain("action-2");
    expect(targets).not.toContain("end-1");
  });

  it("returns empty array when source node not found", () => {
    const targets = computeValidTargets("nonexistent", "source", nodes);
    expect(targets).toEqual([]);
  });

  it("allows connections from trigger to action nodes", () => {
    const targets = computeValidTargets("start-1", "source", nodes);
    expect(targets).toContain("action-1");
    expect(targets).toContain("action-2");
    expect(targets).toContain("end-1");
  });

  it("does not allow connections from sink to other nodes via source handle", () => {
    const targets = computeValidTargets("end-1", "source", nodes);
    expect(targets).toEqual([]);
  });

  it("handles null handle type", () => {
    const targets = computeValidTargets("action-1", null, nodes);
    expect(targets).toContain("action-2");
    expect(targets).not.toContain("action-1");
  });

  it("returns empty for empty node list", () => {
    const targets = computeValidTargets("action-1", "source", []);
    expect(targets).toEqual([]);
  });

  it("handles nodes without explicit type", () => {
    const typelessNodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
    ];
    const targets = computeValidTargets("a", "source", typelessNodes);
    expect(targets).toContain("b");
  });
});
