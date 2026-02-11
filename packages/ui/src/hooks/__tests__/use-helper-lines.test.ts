import { describe, expect, it } from "bun:test";
import type { Node } from "@xyflow/react";
import { computeHelperLines } from "../use-helper-lines";

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 100;

function createNode(options: {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}): Node {
  const node: Node = {
    id: options.id,
    position: { x: options.x, y: options.y },
    data: {},
  };

  if (options.width !== undefined || options.height !== undefined) {
    node.measured = {
      width: options.width ?? DEFAULT_WIDTH,
      height: options.height ?? DEFAULT_HEIGHT,
    };
  }

  return node;
}

describe("computeHelperLines", () => {
  it("returns no lines when there are no other nodes", () => {
    const dragging = createNode({ id: "a", x: 100, y: 100 });
    const result = computeHelperLines(dragging, [dragging], 5);

    expect(result.lines.horizontal).toBeUndefined();
    expect(result.lines.vertical).toBeUndefined();
    expect(result.snappedPosition).toBeNull();
  });

  it("returns no lines when nodes are far apart", () => {
    const dragging = createNode({ id: "a", x: 0, y: 0 });
    const other = createNode({ id: "b", x: 1000, y: 1000 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.horizontal).toBeUndefined();
    expect(result.lines.vertical).toBeUndefined();
    expect(result.snappedPosition).toBeNull();
  });

  it("snaps horizontal center-to-center alignment", () => {
    const dragging = createNode({ id: "a", x: 100, y: 52 });
    const other = createNode({ id: "b", x: 500, y: 50 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    const expectedCenterY = other.position.y + DEFAULT_HEIGHT / 2;
    expect(result.lines.horizontal).toBe(expectedCenterY);
    expect(result.snappedPosition).not.toBeNull();
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.y).toBe(50);
  });

  it("snaps vertical center-to-center alignment", () => {
    const dragging = createNode({ id: "a", x: 102, y: 500 });
    const other = createNode({ id: "b", x: 100, y: 0 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    const expectedCenterX = other.position.x + DEFAULT_WIDTH / 2;
    expect(result.lines.vertical).toBe(expectedCenterX);
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.x).toBe(100);
  });

  it("snaps top-to-top alignment", () => {
    const dragging = createNode({
      id: "a",
      x: 500,
      y: 53,
      width: 100,
      height: 200,
    });
    const other = createNode({
      id: "b",
      x: 0,
      y: 50,
      width: 100,
      height: 50,
    });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.horizontal).toBe(50);
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.y).toBe(50);
  });

  it("snaps left-to-left alignment", () => {
    const dragging = createNode({
      id: "a",
      x: 103,
      y: 500,
      width: 200,
      height: 100,
    });
    const other = createNode({
      id: "b",
      x: 100,
      y: 0,
      width: 50,
      height: 100,
    });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.vertical).toBe(100);
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.x).toBe(100);
  });

  it("snaps bottom-to-bottom alignment", () => {
    const dragging = createNode({
      id: "a",
      x: 500,
      y: 148,
      width: 100,
      height: 200,
    });
    const other = createNode({
      id: "b",
      x: 0,
      y: 300,
      width: 100,
      height: 50,
    });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.horizontal).toBe(350);
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.y).toBe(150);
  });

  it("snaps right-to-right alignment", () => {
    const dragging = createNode({
      id: "a",
      x: 47,
      y: 500,
      width: 200,
      height: 100,
    });
    const other = createNode({
      id: "b",
      x: 200,
      y: 0,
      width: 50,
      height: 100,
    });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.vertical).toBe(250);
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.x).toBe(50);
  });

  it("snaps top-to-bottom alignment (dragging top aligns to other bottom)", () => {
    const otherY = 50;
    const otherBottom = otherY + DEFAULT_HEIGHT;
    const dragging = createNode({ id: "a", x: 500, y: otherBottom + 3 });
    const other = createNode({ id: "b", x: 0, y: otherY });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.horizontal).toBe(otherBottom);
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.y).toBe(otherBottom);
  });

  it("snaps left-to-right alignment (dragging left aligns to other right)", () => {
    const otherX = 50;
    const otherRight = otherX + DEFAULT_WIDTH;
    const dragging = createNode({ id: "a", x: otherRight + 2, y: 500 });
    const other = createNode({ id: "b", x: otherX, y: 0 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.vertical).toBe(otherRight);
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.x).toBe(otherRight);
  });

  it("picks the closest match among multiple nodes", () => {
    const dragging = createNode({ id: "a", x: 100, y: 100 });
    const farNode = createNode({ id: "b", x: 104, y: 104 });
    const closeNode = createNode({ id: "c", x: 101, y: 101 });
    const allNodes = [dragging, farNode, closeNode];
    const result = computeHelperLines(dragging, allNodes, 5);

    const closeCenterX = closeNode.position.x + DEFAULT_WIDTH / 2;
    const closeCenterY = closeNode.position.y + DEFAULT_HEIGHT / 2;
    expect(result.lines.vertical).toBe(closeCenterX);
    expect(result.lines.horizontal).toBe(closeCenterY);
  });

  it("handles both horizontal and vertical snap simultaneously", () => {
    const dragging = createNode({ id: "a", x: 102, y: 53 });
    const other = createNode({ id: "b", x: 100, y: 50 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.horizontal).toBeDefined();
    expect(result.lines.vertical).toBeDefined();
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.x).toBe(100);
    expect(snapped.y).toBe(50);
  });

  it("uses default dimensions when measured is undefined", () => {
    const dragging: Node = {
      id: "a",
      position: { x: 102, y: 0 },
      data: {},
    };
    const other: Node = {
      id: "b",
      position: { x: 100, y: 500 },
      data: {},
    };
    const result = computeHelperLines(dragging, [dragging, other], 5);

    const expectedCenterX = 100 + DEFAULT_WIDTH / 2;
    expect(result.lines.vertical).toBe(expectedCenterX);
  });

  it("respects custom measured dimensions", () => {
    const dragging = createNode({
      id: "a",
      x: 0,
      y: 0,
      width: 200,
      height: 50,
    });
    const other = createNode({
      id: "b",
      x: 2,
      y: 500,
      width: 200,
      height: 80,
    });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.vertical).toBe(2 + 200 / 2);
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.x).toBe(2);
  });

  it("excludes the dragging node from comparison", () => {
    const dragging = createNode({ id: "a", x: 100, y: 100 });
    const result = computeHelperLines(dragging, [dragging], 5);

    expect(result.lines.horizontal).toBeUndefined();
    expect(result.lines.vertical).toBeUndefined();
  });

  it("snaps at exactly the snap distance boundary", () => {
    const dragging = createNode({ id: "a", x: 100, y: 0 });
    const other = createNode({ id: "b", x: 105, y: 500 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    const expectedCenterX = 105 + DEFAULT_WIDTH / 2;
    expect(result.lines.vertical).toBe(expectedCenterX);
  });

  it("does not snap beyond the snap distance", () => {
    const dragging = createNode({ id: "a", x: 100, y: 0 });
    const other = createNode({ id: "b", x: 106, y: 500 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.vertical).toBeUndefined();
  });

  it("preserves original position axis when only one axis snaps", () => {
    const dragging = createNode({ id: "a", x: 102, y: 1000 });
    const other = createNode({ id: "b", x: 100, y: 0 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.vertical).toBeDefined();
    expect(result.lines.horizontal).toBeUndefined();
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.y).toBe(1000);
  });

  it("works with negative coordinates", () => {
    const dragging = createNode({ id: "a", x: -102, y: -53 });
    const other = createNode({ id: "b", x: -100, y: -50 });
    const result = computeHelperLines(dragging, [dragging, other], 5);

    expect(result.lines.vertical).toBeDefined();
    expect(result.lines.horizontal).toBeDefined();
    const snapped = result.snappedPosition as { x: number; y: number };
    expect(snapped.x).toBe(-100);
    expect(snapped.y).toBe(-50);
  });

  it("handles zero snap distance", () => {
    const dragging = createNode({ id: "a", x: 100, y: 100 });
    const other = createNode({ id: "b", x: 100, y: 100 });
    const result = computeHelperLines(dragging, [dragging, other], 0);

    expect(result.lines.vertical).toBe(100 + DEFAULT_WIDTH / 2);
    expect(result.lines.horizontal).toBe(100 + DEFAULT_HEIGHT / 2);
  });
});
