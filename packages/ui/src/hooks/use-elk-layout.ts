"use client";

import type { Edge, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { useCallback } from "react";

const elk = new ELK();

const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 100;

interface ELKLayoutOptions {
  algorithm?: string;
  direction?: string;
  nodeSpacing?: string;
  layerSpacing?: string;
}

export async function layoutWithELK(
  nodes: Node[],
  edges: Edge[],
  options: ELKLayoutOptions = {}
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": options.algorithm ?? "layered",
      "elk.direction": options.direction ?? "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers":
        options.layerSpacing ?? "100",
      "elk.spacing.nodeNode": options.nodeSpacing ?? "80",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
      height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(graph);

  return {
    nodes: nodes.map((node) => {
      const elkNode = layout.children?.find((n) => n.id === node.id);
      if (elkNode) {
        return {
          ...node,
          position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
        };
      }
      return node;
    }),
    edges,
  };
}

export function useELKLayout(options: ELKLayoutOptions = {}) {
  const { setNodes, setEdges, fitView, getNodes, getEdges } = useReactFlow();

  const runLayout = useCallback(async () => {
    const result = await layoutWithELK(getNodes(), getEdges(), options);
    setNodes(result.nodes);
    setEdges(result.edges);
    requestAnimationFrame(() => fitView({ duration: 200 }));
  }, [options, getNodes, getEdges, setNodes, setEdges, fitView]);

  return { runLayout };
}
