import { describe, expect, it } from "vitest";
import { wouldCreateCycle } from "../workflows/mission/mission-orchestrator";

describe("wouldCreateCycle", () => {
  it("returns false for unrelated agents", () => {
    const tree = new Map<string, string>();
    tree.set("B", "A");

    expect(wouldCreateCycle(tree, "C", "D")).toBe(false);
  });

  it("returns true for direct cycle (A→B, B tries to spawn A)", () => {
    const tree = new Map<string, string>();
    tree.set("B", "A");

    expect(wouldCreateCycle(tree, "B", "A")).toBe(true);
  });

  it("returns true for transitive cycle (A→B→C, C tries to spawn A)", () => {
    const tree = new Map<string, string>();
    tree.set("B", "A");
    tree.set("C", "B");

    expect(wouldCreateCycle(tree, "C", "A")).toBe(true);
  });

  it("returns false for deep but non-cyclic tree", () => {
    const tree = new Map<string, string>();
    tree.set("B", "A");
    tree.set("C", "B");
    tree.set("D", "C");
    tree.set("E", "D");

    expect(wouldCreateCycle(tree, "E", "F")).toBe(false);
  });

  it("handles self-spawn attempt", () => {
    const tree = new Map<string, string>();

    expect(wouldCreateCycle(tree, "A", "A")).toBe(true);
  });

  it("returns false for empty spawnTree", () => {
    const tree = new Map<string, string>();

    expect(wouldCreateCycle(tree, "A", "B")).toBe(false);
  });

  it("detects cycle in deep chain", () => {
    const tree = new Map<string, string>();
    tree.set("B", "A");
    tree.set("C", "B");
    tree.set("D", "C");
    tree.set("E", "D");
    tree.set("F", "E");

    expect(wouldCreateCycle(tree, "F", "A")).toBe(true);
    expect(wouldCreateCycle(tree, "F", "C")).toBe(true);
  });

  it("handles branching tree without false positives", () => {
    const tree = new Map<string, string>();
    tree.set("B", "A");
    tree.set("C", "A");
    tree.set("D", "B");
    tree.set("E", "C");

    expect(wouldCreateCycle(tree, "D", "E")).toBe(false);
    expect(wouldCreateCycle(tree, "E", "D")).toBe(false);
    expect(wouldCreateCycle(tree, "D", "A")).toBe(true);
    expect(wouldCreateCycle(tree, "E", "A")).toBe(true);
  });

  it("serializes/deserializes correctly through checkpoint", () => {
    const original = new Map<string, string>();
    original.set("B", "A");
    original.set("C", "B");
    original.set("D", "C");

    const serialized = [...original.entries()];
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json) as [string, string][];
    const restored = new Map(parsed);

    expect(wouldCreateCycle(restored, "D", "A")).toBe(true);
    expect(wouldCreateCycle(restored, "D", "E")).toBe(false);
    expect(restored.size).toBe(original.size);
    for (const [key, value] of original) {
      expect(restored.get(key)).toBe(value);
    }
  });
});
