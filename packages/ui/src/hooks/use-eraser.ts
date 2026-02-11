"use client";

import type { SpatialAnnotation } from "@openplane/types/canvas";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";
import { useAnnotationStore } from "../stores/annotation-store";

export interface UseEraserReturn {
  isErasing: boolean;
  eraserPosition: { x: number; y: number } | null;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
}

const ERASER_RADIUS = 20;

function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function freehandIntersects(
  annotation: SpatialAnnotation,
  cursor: { x: number; y: number }
): boolean {
  return annotation.points.some(
    (point) => distanceBetween(point, cursor) <= ERASER_RADIUS
  );
}

function rectangleIntersects(
  annotation: SpatialAnnotation,
  cursor: { x: number; y: number }
): boolean {
  if (annotation.points.length < 2) {
    return false;
  }

  const xs = annotation.points.map((p) => p.x);
  const ys = annotation.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return (
    cursor.x >= minX - ERASER_RADIUS &&
    cursor.x <= maxX + ERASER_RADIUS &&
    cursor.y >= minY - ERASER_RADIUS &&
    cursor.y <= maxY + ERASER_RADIUS
  );
}

function annotationIntersects(
  annotation: SpatialAnnotation,
  cursor: { x: number; y: number }
): boolean {
  switch (annotation.type) {
    case "freehand":
      return freehandIntersects(annotation, cursor);
    case "rectangle":
      return rectangleIntersects(annotation, cursor);
    case "arrow":
      return freehandIntersects(annotation, cursor);
    case "text":
      return freehandIntersects(annotation, cursor);
    default:
      return false;
  }
}

export function useEraser(): UseEraserReturn {
  const { screenToFlowPosition } = useReactFlow();
  const annotations = useAnnotationStore((s) => s.annotations);
  const removeAnnotation = useAnnotationStore((s) => s.removeAnnotation);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserPosition, setEraserPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const eraseAt = useCallback(
    (cursor: { x: number; y: number }) => {
      for (const annotation of annotations) {
        if (annotationIntersects(annotation, cursor)) {
          removeAnnotation(annotation.id);
        }
      }
    },
    [annotations, removeAnnotation]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setIsErasing(true);
      setEraserPosition(pos);
      eraseAt(pos);
    },
    [screenToFlowPosition, eraseAt]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isErasing) {
        return;
      }
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setEraserPosition(pos);
      eraseAt(pos);
    },
    [isErasing, screenToFlowPosition, eraseAt]
  );

  const onPointerUp = useCallback(() => {
    setIsErasing(false);
    setEraserPosition(null);
  }, []);

  return {
    isErasing,
    eraserPosition,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
