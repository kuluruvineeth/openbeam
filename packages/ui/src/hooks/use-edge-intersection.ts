"use client";

import type { Edge, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";

export function useEdgeIntersection() {
  const { getEdge, setEdges } = useReactFlow();
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(
    null
  );

  const onNodeDrag = useCallback((_event: MouseEvent, node: Node) => {
    const cx = node.position.x + (node.measured?.width ?? 0) / 2;
    const cy = node.position.y + (node.measured?.height ?? 0) / 2;

    const elements = document.elementsFromPoint(cx, cy);
    const edgeElement = elements.find((el) =>
      el.classList.contains("react-flow__edge-interaction")
    );

    const edgeId = edgeElement?.getAttribute("data-id") ?? null;
    setHighlightedEdgeId(edgeId);
  }, []);

  const onNodeDragStop = useCallback(() => {
    setHighlightedEdgeId(null);
  }, []);

  const insertNodeOnEdge = useCallback(
    (nodeId: string, edgeId: string) => {
      const edge = getEdge(edgeId);
      if (!edge) {
        return;
      }

      setEdges((edges: Edge[]) => {
        const newSourceEdge: Edge = {
          id: `${edge.source}-${nodeId}`,
          source: edge.source,
          target: nodeId,
          sourceHandle: edge.sourceHandle,
          type: edge.type,
        };

        const newTargetEdge: Edge = {
          id: `${nodeId}-${edge.target}`,
          source: nodeId,
          target: edge.target,
          targetHandle: edge.targetHandle,
          type: edge.type,
        };

        return edges
          .filter((e: Edge) => e.id !== edgeId)
          .concat(newSourceEdge, newTargetEdge);
      });
    },
    [getEdge, setEdges]
  );

  return { highlightedEdgeId, insertNodeOnEdge, onNodeDrag, onNodeDragStop };
}
