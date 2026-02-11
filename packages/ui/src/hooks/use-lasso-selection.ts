"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

export interface UseLassoSelectionReturn {
  isLassoing: boolean;
  lassoPath: string | null;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
}

interface LassoPoint {
  x: number;
  y: number;
}

export function pointInPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[]
): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i] as LassoPoint;
    const pj = polygon[j] as LassoPoint;

    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointsToSvgPath(points: LassoPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  const [first, ...rest] = points as [LassoPoint, ...LassoPoint[]];
  let path = `M ${first.x} ${first.y}`;
  for (const p of rest) {
    path += ` L ${p.x} ${p.y}`;
  }
  path += " Z";
  return path;
}

export function useLassoSelection(): UseLassoSelectionReturn {
  const { screenToFlowPosition, getNodes, setNodes } = useReactFlow();
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoPath, setLassoPath] = useState<string | null>(null);
  const pointsRef = useRef<LassoPoint[]>([]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      pointsRef.current = [{ x: pos.x, y: pos.y }];
      setIsLassoing(true);
      setLassoPath(null);
    },
    [screenToFlowPosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isLassoing) {
        return;
      }
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      pointsRef.current.push({ x: pos.x, y: pos.y });
      setLassoPath(pointsToSvgPath(pointsRef.current));
    },
    [isLassoing, screenToFlowPosition]
  );

  const onPointerUp = useCallback(() => {
    if (!isLassoing) {
      return;
    }
    setIsLassoing(false);

    const polygon = pointsRef.current;
    if (polygon.length < 3) {
      setLassoPath(null);
      return;
    }

    const nodes = getNodes();
    const selectedIds = new Set<string>();

    for (const node of nodes) {
      const width = node.measured?.width ?? 320;
      const height = node.measured?.height ?? 100;
      const center = {
        x: node.position.x + width / 2,
        y: node.position.y + height / 2,
      };

      if (pointInPolygon(center, polygon)) {
        selectedIds.add(node.id);
      }
    }

    setNodes((ns) =>
      ns.map((n) => ({ ...n, selected: selectedIds.has(n.id) }))
    );

    setLassoPath(null);
    pointsRef.current = [];
  }, [isLassoing, getNodes, setNodes]);

  return {
    isLassoing,
    lassoPath,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
