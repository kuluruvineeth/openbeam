"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

export function useExpandCollapse() {
  const { getNodes, setNodes } = useReactFlow();

  const toggleExpand = useCallback(
    (nodeId: string) => {
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === nodeId) {
            return { ...n, data: { ...n.data, expanded: !n.data.expanded } };
          }
          return n;
        })
      );
    },
    [setNodes]
  );

  const getVisibleNodes = useCallback(() => {
    const nodes = getNodes();
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
  }, [getNodes]);

  return { toggleExpand, getVisibleNodes };
}
