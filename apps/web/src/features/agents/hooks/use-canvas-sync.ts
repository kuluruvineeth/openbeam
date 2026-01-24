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

export function useCanvasSync(canvas: CanvasData | null | undefined) {
  const loadCanvas = useCanvasStore((s) => s.loadCanvas);
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
    const edges = canvas.edges ?? [];
    const viewport = canvas.viewport ?? undefined;

    loadCanvas(nodes, edges, viewport);
    loadedCanvasIdRef.current = canvasId;
  }, [canvas, canvasId, loadCanvas, reset]);

  useEffect(
    () => () => {
      reset();
      loadedCanvasIdRef.current = null;
    },
    [reset]
  );
}
