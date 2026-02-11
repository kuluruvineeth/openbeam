import { describe, expect, it } from "bun:test";
import type { Node } from "@xyflow/react";
import {
  computeDistance,
  computeNodeCenter,
  computeProximityIntents,
  isTypeCompatible,
} from "../use-proximity-connect";

function createNode(opts: {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}): Node {
  return {
    id: opts.id,
    type: opts.type,
    position: { x: opts.x, y: opts.y },
    data: {},
    measured: { width: opts.width ?? 320, height: opts.height ?? 100 },
  };
}

describe("computeNodeCenter", () => {
  it("computes center from position and measured size", () => {
    const node = createNode({
      id: "a",
      type: "action",
      x: 100,
      y: 200,
      width: 320,
      height: 100,
    });
    const center = computeNodeCenter(node);
    expect(center.x).toBe(260);
    expect(center.y).toBe(250);
  });

  it("uses default dimensions when measured is undefined", () => {
    const node: Node = {
      id: "a",
      type: "action",
      position: { x: 0, y: 0 },
      data: {},
    };
    const center = computeNodeCenter(node);
    expect(center.x).toBe(160);
    expect(center.y).toBe(50);
  });
});

describe("computeDistance", () => {
  it("returns 0 for same point", () => {
    expect(computeDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it("computes euclidean distance", () => {
    expect(computeDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("handles negative coordinates", () => {
    expect(computeDistance({ x: -3, y: 0 }, { x: 0, y: 4 })).toBe(5);
  });
});

describe("isTypeCompatible", () => {
  it("allows action to action", () => {
    expect(isTypeCompatible("action", "llm")).toBe(true);
  });

  it("rejects sink as source", () => {
    expect(isTypeCompatible("end", "action")).toBe(false);
  });

  it("rejects source-only as target", () => {
    expect(isTypeCompatible("action", "trigger_manual")).toBe(false);
  });

  it("allows trigger to action", () => {
    expect(isTypeCompatible("trigger_manual", "action")).toBe(true);
  });

  it("allows action to end", () => {
    expect(isTypeCompatible("action", "end")).toBe(true);
  });
});

describe("computeProximityIntents", () => {
  it("generates intents for nodes within threshold", () => {
    const dragged = createNode({ id: "a", type: "action", x: 0, y: 0 });
    const nearby = createNode({ id: "b", type: "action", x: 100, y: 0 });
    const intents = computeProximityIntents(dragged, [dragged, nearby], 500);
    expect(intents.length).toBeGreaterThanOrEqual(1);
    expect(intents[0]?.source).toBe("a");
    expect(intents[0]?.target).toBe("b");
    expect(intents[0]?.inferredFrom).toBe("proximity");
  });

  it("returns empty for nodes beyond threshold", () => {
    const dragged = createNode({ id: "a", type: "action", x: 0, y: 0 });
    const far = createNode({ id: "b", type: "action", x: 2000, y: 2000 });
    const intents = computeProximityIntents(dragged, [dragged, far], 150);
    expect(intents).toEqual([]);
  });

  it("excludes the dragged node itself", () => {
    const dragged = createNode({ id: "a", type: "action", x: 0, y: 0 });
    const intents = computeProximityIntents(dragged, [dragged], 500);
    expect(intents).toEqual([]);
  });

  it("respects type compatibility", () => {
    const dragged = createNode({ id: "end-1", type: "end", x: 0, y: 0 });
    const nearby = createNode({ id: "action-1", type: "action", x: 50, y: 0 });
    const intents = computeProximityIntents(dragged, [dragged, nearby], 500);
    const outgoing = intents.filter((i) => i.source === "end-1");
    expect(outgoing).toEqual([]);
  });

  it("sorts intents by confidence descending", () => {
    const dragged = createNode({ id: "a", type: "action", x: 0, y: 0 });
    const close = createNode({ id: "b", type: "action", x: 50, y: 0 });
    const far = createNode({ id: "c", type: "action", x: 300, y: 0 });
    const intents = computeProximityIntents(
      dragged,
      [dragged, close, far],
      500
    );
    const confidences = intents.map((i) => i.confidence);
    for (let i = 1; i < confidences.length; i++) {
      expect(confidences[i]).toBeLessThanOrEqual(confidences[i - 1]);
    }
  });

  it("computes confidence inversely proportional to distance", () => {
    const dragged = createNode({ id: "a", type: "action", x: 0, y: 0 });
    const nearby = createNode({ id: "b", type: "action", x: 50, y: 0 });
    const intents = computeProximityIntents(dragged, [dragged, nearby], 500);
    const intent = intents.find((i) => i.target === "b");
    expect(intent).toBeDefined();
    expect(intent?.confidence).toBeGreaterThan(0);
    expect(intent?.confidence).toBeLessThanOrEqual(1);
  });
});
