"use client";

import type { Edge, Node } from "@xyflow/react";
import {
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  useReactFlow,
} from "@xyflow/react";
import { useCallback } from "react";

type OnNodesDeleteHandler = (deleted: Node[]) => void;

interface UseDeleteReconnectReturn {
  onNodesDelete: OnNodesDeleteHandler;
}

export function useDeleteReconnect(): UseDeleteReconnectReturn {
  const { getNodes, getEdges, setEdges } = useReactFlow();

  const onNodesDelete: OnNodesDeleteHandler = useCallback(
    (deleted: Node[]) => {
      const allNodes = getNodes();
      const allEdges = getEdges();

      const bridgeEdges: Edge[] = [];
      const edgesToRemove = new Set<string>();

      for (const deletedNode of deleted) {
        const connectedEdges = getConnectedEdges([deletedNode], allEdges);
        for (const edge of connectedEdges) {
          edgesToRemove.add(edge.id);
        }

        const incomers = getIncomers(deletedNode, allNodes, allEdges);
        const outgoers = getOutgoers(deletedNode, allNodes, allEdges);

        for (const incomer of incomers) {
          for (const outgoer of outgoers) {
            bridgeEdges.push({
              id: `edge-${incomer.id}-${outgoer.id}-${crypto.randomUUID().slice(0, 8)}`,
              source: incomer.id,
              target: outgoer.id,
              type: "data",
            });
          }
        }
      }

      setEdges((currentEdges) => [
        ...currentEdges.filter((e) => !edgesToRemove.has(e.id)),
        ...bridgeEdges,
      ]);
    },
    [getNodes, getEdges, setEdges]
  );

  return { onNodesDelete };
}

export type { OnNodesDeleteHandler, UseDeleteReconnectReturn };
