import type { Node } from "@xyflow/react";

const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 100;

interface CollisionBox {
  node: Node;
  x: number;
  y: number;
  width: number;
  height: number;
  moved: boolean;
}

export function resolveCollisions(
  nodes: Node[],
  options: { maxIterations?: number; margin?: number } = {}
): Node[] {
  const { maxIterations = 50, margin = 20 } = options;
  const boxes: CollisionBox[] = nodes.map((n) => ({
    node: n,
    x: n.position.x,
    y: n.position.y,
    width: (n.measured?.width ?? DEFAULT_NODE_WIDTH) + margin,
    height: (n.measured?.height ?? DEFAULT_NODE_HEIGHT) + margin,
    moved: false,
  }));

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i] as CollisionBox;
        const b = boxes[j] as CollisionBox;
        const dx = a.x + a.width / 2 - (b.x + b.width / 2);
        const dy = a.y + a.height / 2 - (b.y + b.height / 2);
        const px = (a.width + b.width) / 2 - Math.abs(dx);
        const py = (a.height + b.height) / 2 - Math.abs(dy);
        if (px > 0 && py > 0) {
          moved = true;
          if (px < py) {
            a.x += (px / 2) * Math.sign(dx);
            b.x -= (px / 2) * Math.sign(dx);
          } else {
            a.y += (py / 2) * Math.sign(dy);
            b.y -= (py / 2) * Math.sign(dy);
          }
          a.moved = true;
          b.moved = true;
        }
      }
    }
    if (!moved) {
      break;
    }
  }

  return boxes.map((b) =>
    b.moved ? { ...b.node, position: { x: b.x, y: b.y } } : b.node
  );
}
