"use client";

import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { timer } from "d3-timer";
import { useCallback, useEffect, useRef } from "react";

const DEFAULT_DURATION = 300;
function noop(): void {
  return;
}

function cubicEaseOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface UseAnimatedLayoutReturn {
  animateToPositions: (targetNodes: Node[]) => () => void;
}

export function useAnimatedLayout(
  duration = DEFAULT_DURATION
): UseAnimatedLayoutReturn {
  const { setNodes } = useReactFlow();
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map()
  );
  const activeTimer = useRef<ReturnType<typeof timer> | null>(null);

  useEffect(
    () => () => {
      activeTimer.current?.stop();
    },
    []
  );

  const animateToPositions = useCallback(
    (targetNodes: Node[]) => {
      activeTimer.current?.stop();

      if (prefersReducedMotion()) {
        setNodes(targetNodes);
        prevPositions.current = new Map(
          targetNodes.map((n) => [n.id, n.position])
        );
        return noop;
      }

      const startPositions = new Map(
        targetNodes.map((n) => [
          n.id,
          prevPositions.current.get(n.id) ?? n.position,
        ])
      );

      const t = timer((elapsed) => {
        const progress = Math.min(elapsed / duration, 1);
        const eased = cubicEaseOut(progress);

        setNodes(
          targetNodes.map((node) => {
            const start = startPositions.get(node.id) ?? node.position;
            return {
              ...node,
              position: {
                x: start.x + (node.position.x - start.x) * eased,
                y: start.y + (node.position.y - start.y) * eased,
              },
            };
          })
        );

        if (progress >= 1) {
          t.stop();
          activeTimer.current = null;
          prevPositions.current = new Map(
            targetNodes.map((n) => [n.id, n.position])
          );
        }
      });

      activeTimer.current = t;

      return () => {
        t.stop();
        activeTimer.current = null;
      };
    },
    [duration, setNodes]
  );

  return { animateToPositions };
}
