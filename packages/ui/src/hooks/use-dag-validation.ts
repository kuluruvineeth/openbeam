"use client";

import type { Connection, Edge, Node } from "@xyflow/react";
import { getOutgoers, useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

export function useDAGValidation() {
  const { getNodes, getEdges } = useReactFlow();

  const isValidConnection = useCallback(
    (connection: Edge | Connection): boolean => {
      if (connection.source === connection.target) {
        return false;
      }

      const nodes = getNodes();
      const edges = getEdges();
      const target = nodes.find((n) => n.id === connection.target);
      if (!target) {
        return false;
      }

      const hasCycle = (node: Node, visited = new Set<string>()): boolean => {
        if (visited.has(node.id)) {
          return false;
        }
        visited.add(node.id);
        for (const outgoer of getOutgoers(node, nodes, edges as Edge[])) {
          if (outgoer.id === connection.source) {
            return true;
          }
          if (hasCycle(outgoer, visited)) {
            return true;
          }
        }
        return false;
      };

      return !hasCycle(target);
    },
    [getNodes, getEdges]
  );

  return { isValidConnection };
}
