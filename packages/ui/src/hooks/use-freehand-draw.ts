"use client";

import type { SpatialAnnotation } from "@openplane/types/canvas";
import { useReactFlow } from "@xyflow/react";
import { getStroke } from "perfect-freehand";
import { useCallback, useRef, useState } from "react";
import { useAnnotationStore } from "../stores/annotation-store";

export interface UseFreehandDrawReturn {
  isDrawing: boolean;
  currentPath: string | null;
  strokeColor: string;
  strokeWidth: number;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
}

interface DrawPoint {
  x: number;
  y: number;
  pressure: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getSvgPathFromStroke(stroke: number[][]): string {
  if (stroke.length === 0) {
    return "";
  }
  if (stroke.length === 1) {
    const [x, y] = stroke[0] as [number, number];
    return `M ${x} ${y} L ${x} ${y}`;
  }

  const [first, ...rest] = stroke as [number[], ...number[][]];
  let path = `M ${first[0]} ${first[1]}`;

  for (let i = 0; i < rest.length - 1; i++) {
    const current = rest[i] as [number, number];
    const next = rest[i + 1] as [number, number];
    const mx = (current[0] + next[0]) / 2;
    const my = (current[1] + next[1]) / 2;
    path += ` Q ${current[0]} ${current[1]} ${mx} ${my}`;
  }

  const last = rest.at(-1) as [number, number];
  path += ` L ${last[0]} ${last[1]}`;

  return path;
}

function getStrokeOptions(strokeWidth: number, reducedMotion: boolean) {
  return {
    size: strokeWidth,
    thinning: reducedMotion ? 0 : 0.5,
    smoothing: reducedMotion ? 0 : 0.5,
    streamline: reducedMotion ? 0 : 0.5,
  };
}

export function useFreehandDraw(): UseFreehandDrawReturn {
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [strokeColor, setStrokeColor] = useState("#3b82f6");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const pointsRef = useRef<DrawPoint[]>([]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      pointsRef.current = [{ x: pos.x, y: pos.y, pressure: e.pressure }];
      setIsDrawing(true);
      setCurrentPath(null);
    },
    [screenToFlowPosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) {
        return;
      }
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      pointsRef.current.push({ x: pos.x, y: pos.y, pressure: e.pressure });

      const reduced = prefersReducedMotion();
      const stroke = getStroke(
        pointsRef.current.map((p) => [p.x, p.y, p.pressure]),
        getStrokeOptions(strokeWidth, reduced)
      );
      setCurrentPath(getSvgPathFromStroke(stroke));
    },
    [isDrawing, screenToFlowPosition, strokeWidth]
  );

  const onPointerUp = useCallback(() => {
    if (!isDrawing) {
      return;
    }
    setIsDrawing(false);

    const points = pointsRef.current;
    if (points.length < 2) {
      setCurrentPath(null);
      return;
    }

    const nodes = getNodes();
    const intersecting = nodes
      .filter((node) => {
        const width = node.measured?.width ?? 320;
        const height = node.measured?.height ?? 100;
        return points.some(
          (p) =>
            p.x >= node.position.x &&
            p.x <= node.position.x + width &&
            p.y >= node.position.y &&
            p.y <= node.position.y + height
        );
      })
      .map((n) => n.id);

    const reduced = prefersReducedMotion();
    const stroke = getStroke(
      points.map((p) => [p.x, p.y, p.pressure]),
      getStrokeOptions(strokeWidth, reduced)
    );
    const svgPath = getSvgPathFromStroke(stroke);

    const annotation: SpatialAnnotation = {
      id: `freehand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "freehand",
      points: points.map((p) => ({
        x: p.x,
        y: p.y,
        pressure: p.pressure,
      })),
      intersectingNodes: intersecting,
      author: "human",
      color: strokeColor,
      strokeWidth,
      createdAt: Date.now(),
      label: svgPath,
    };

    addAnnotation(annotation);
    setCurrentPath(null);
    pointsRef.current = [];
  }, [isDrawing, getNodes, strokeColor, strokeWidth, addAnnotation]);

  return {
    isDrawing,
    currentPath,
    strokeColor,
    strokeWidth,
    setStrokeColor,
    setStrokeWidth,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
