"use client";

import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import { Position, useNodesInitialized, useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

type LayoutDirection = "TB" | "LR" | "BT" | "RL";

interface LayoutOptions {
  direction?: LayoutDirection;
  nodeSpacing?: number;
  rankSpacing?: number;
}

const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 100;

export function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const { direction = "LR", nodeSpacing = 80, rankSpacing = 100 } = options;
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
  });

  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
      height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
    });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  dagre.layout(g);

  const isHorizontal = direction === "LR" || direction === "RL";

  return {
    nodes: nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: {
          x: pos.x - (node.measured?.width ?? DEFAULT_NODE_WIDTH) / 2,
          y: pos.y - (node.measured?.height ?? DEFAULT_NODE_HEIGHT) / 2,
        },
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      };
    }),
    edges,
  };
}

export function useAutoLayout(options: LayoutOptions = {}) {
  const { setNodes, setEdges, fitView, getNodes, getEdges } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const runLayout = useCallback(() => {
    if (!nodesInitialized) {
      return;
    }
    const result = layoutWithDagre(getNodes(), getEdges(), options);
    setNodes(result.nodes);
    setEdges(result.edges);
    requestAnimationFrame(() => fitView({ duration: 200 }));
  }, [
    nodesInitialized,
    options,
    getNodes,
    getEdges,
    setNodes,
    setEdges,
    fitView,
  ]);

  return { runLayout };
}
