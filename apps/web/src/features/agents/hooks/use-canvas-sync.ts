"use client";

import type {
  AgentCanvasEdge,
  AgentCanvasNode,
  Viewport,
} from "@openplane/types/canvas";
import { useCanvasStore } from "@openplane/ui";
import { useEffect, useRef } from "react";

interface CanvasData {
  id?: string;
  nodes: AgentCanvasNode[] | null;
  edges: AgentCanvasEdge[] | null;
  viewport?: Viewport | null;
}

const EDGE_TYPES = new Set(["data", "control", "conditional", "error"]);

function normalizeEdges(edges: AgentCanvasEdge[]) {
  let changed = false;
  const nextEdges = edges.map((edge) => {
    const rawType = edge.type;
    const isAnimated = rawType === "animated";
    const isValidType = rawType ? EDGE_TYPES.has(rawType) : false;
    const nextType = isValidType ? rawType : "data";
    const existingData =
      typeof edge.data === "object" && edge.data !== null
        ? (edge.data as Record<string, unknown>)
        : {};
    const nextData =
      isAnimated && existingData.animated === undefined
        ? { ...existingData, animated: true }
        : existingData;

    if (nextType !== rawType || nextData !== existingData) {
      changed = true;
    }

    if (nextType === rawType && nextData === existingData) {
      return edge;
    }

    return {
      ...edge,
      type: nextType,
      data: nextData,
    };
  });

  return { edges: nextEdges, changed };
}

export function useCanvasSync(canvas: CanvasData | null | undefined) {
  const loadCanvas = useCanvasStore((s) => s.loadCanvas);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const reset = useCanvasStore((s) => s.reset);
  const loadedCanvasIdRef = useRef<string | null>(null);

  const canvasId = canvas?.id ?? null;

  useEffect(() => {
    if (!canvas) {
      return;
    }

    if (loadedCanvasIdRef.current === canvasId) {
      return;
    }

    if (
      loadedCanvasIdRef.current !== null &&
      loadedCanvasIdRef.current !== canvasId
    ) {
      reset();
    }

    const nodes = canvas.nodes ?? [];
    const rawEdges = canvas.edges ?? [];
    const normalized = normalizeEdges(rawEdges);
    const viewport = canvas.viewport ?? undefined;

    loadCanvas(nodes, normalized.edges, viewport);
    if (normalized.changed) {
      setEdges(normalized.edges);
    }
    loadedCanvasIdRef.current = canvasId;
  }, [canvas, canvasId, loadCanvas, reset, setEdges]);

  useEffect(
    () => () => {
      reset();
      loadedCanvasIdRef.current = null;
    },
    [reset]
  );
}
