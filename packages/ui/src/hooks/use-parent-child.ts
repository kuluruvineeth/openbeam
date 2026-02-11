"use client";

import type { OnNodeDrag } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

const GROUP_TYPES = new Set(["group"]);

export function useParentChild() {
  const { getIntersectingNodes, setNodes } = useReactFlow();

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const intersections = getIntersectingNodes(node);
      const parentGroup = intersections.find((n) =>
        GROUP_TYPES.has(n.type ?? "")
      );

      if (parentGroup && node.parentId !== parentGroup.id) {
        setNodes((ns) =>
          ns.map((n) => {
            if (n.id !== node.id) {
              return n;
            }
            return {
              ...n,
              parentId: parentGroup.id,
              extent: "parent" as const,
              position: {
                x: n.position.x - parentGroup.position.x,
                y: n.position.y - parentGroup.position.y,
              },
            };
          })
        );
      }
    },
    [getIntersectingNodes, setNodes]
  );

  const detachFromParent = useCallback(
    (nodeId: string) => {
      setNodes((ns) => {
        const node = ns.find((n) => n.id === nodeId);
        if (!node?.parentId) {
          return ns;
        }
        const parent = ns.find((n) => n.id === node.parentId);
        if (!parent) {
          return ns;
        }
        return ns.map((n) => {
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
      });
    },
    [setNodes]
  );

  return { onNodeDragStop, detachFromParent };
}
