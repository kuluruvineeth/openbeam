"use client";

import type { SpatialAnnotation } from "@openbeam/types/canvas";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import { useAnnotationStore } from "../stores/annotation-store";

export interface UseRectangleDrawReturn {
  isDrawing: boolean;
  currentRect: { x: number; y: number; width: number; height: number } | null;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
}

interface RectOrigin {
  x: number;
  y: number;
}

function computeRect(
  origin: RectOrigin,
  current: RectOrigin
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(origin.x, current.x);
  const y = Math.min(origin.y, current.y);
  return {
    x,
    y,
    width: Math.abs(current.x - origin.x),
    height: Math.abs(current.y - origin.y),
  };
}

function rectToCornerPoints(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

export function useRectangleDraw(): UseRectangleDrawReturn {
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const originRef = useRef<RectOrigin | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      originRef.current = { x: pos.x, y: pos.y };
      setIsDrawing(true);
      setCurrentRect(null);
    },
    [screenToFlowPosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!(isDrawing && originRef.current)) {
        return;
      }
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setCurrentRect(computeRect(originRef.current, pos));
    },
    [isDrawing, screenToFlowPosition]
  );

  const onPointerUp = useCallback(() => {
    if (!(isDrawing && originRef.current)) {
      return;
    }
    setIsDrawing(false);

    const rect = currentRect;
    if (!rect || rect.width < 5 || rect.height < 5) {
      setCurrentRect(null);
      originRef.current = null;
      return;
    }

    const nodes = getNodes();
    const intersecting = nodes
      .filter((node) => {
        const width = node.measured?.width ?? 320;
        const height = node.measured?.height ?? 100;
        const nodeRight = node.position.x + width;
        const nodeBottom = node.position.y + height;
        const rectRight = rect.x + rect.width;
        const rectBottom = rect.y + rect.height;

        return (
          node.position.x < rectRight &&
          nodeRight > rect.x &&
          node.position.y < rectBottom &&
          nodeBottom > rect.y
        );
      })
      .map((n) => n.id);

    const annotation: SpatialAnnotation = {
      id: `rect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "rectangle",
      points: rectToCornerPoints(rect),
      intersectingNodes: intersecting,
      author: "human",
      color: "#3b82f6",
      createdAt: Date.now(),
    };

    addAnnotation(annotation);
    setCurrentRect(null);
    originRef.current = null;
  }, [isDrawing, currentRect, getNodes, addAnnotation]);

  return {
    isDrawing,
    currentRect,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
