"use client";

import type { Edge, Node } from "@xyflow/react";
import { useNodesInitialized, useReactFlow, useStore } from "@xyflow/react";
import { useEffect, useMemo, useRef } from "react";
import { layoutWithDagre } from "./use-auto-layout";
import { resolveCollisions } from "./use-collision-resolution";

interface DynamicLayoutOptions {
  direction?: "TB" | "LR" | "BT" | "RL";
  nodeSpacing?: number;
  rankSpacing?: number;
  enabled?: boolean;
}

export function useDynamicLayout(options: DynamicLayoutOptions = {}) {
  const { enabled = true, direction, nodeSpacing, rankSpacing } = options;
  const { setNodes, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const prevStructure = useRef<string>("");

  const layoutOptions = useMemo(
    () => ({ direction, nodeSpacing, rankSpacing }),
    [direction, nodeSpacing, rankSpacing]
  );

  const elements = useStore(
    (state) => ({ nodes: state.nodes, edges: state.edges }),
    (a, b) =>
      a.nodes.length === b.nodes.length && a.edges.length === b.edges.length
  );

  useEffect(() => {
    if (!(enabled && nodesInitialized) || elements.nodes.length === 0) {
      return;
    }

    const structureKey =
      elements.nodes
        .map((n: Node) => n.id)
        .sort()
        .join(",") +
      "|" +
      elements.edges
        .map((e: Edge) => `${e.source}-${e.target}`)
        .sort()
        .join(",");

    if (structureKey === prevStructure.current) {
      return;
    }
    prevStructure.current = structureKey;

    const result = layoutWithDagre(
      elements.nodes as Node[],
      elements.edges as Edge[],
      layoutOptions
    );
    const resolved = resolveCollisions(result.nodes);
    setNodes(resolved);
    requestAnimationFrame(() => fitView({ duration: 200 }));
  }, [elements, nodesInitialized, enabled, layoutOptions, setNodes, fitView]);
}
