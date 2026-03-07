"use client";

import type { SpatialAnnotation } from "@openbeam/types/canvas";
import { useStore } from "@xyflow/react";
import { memo, type ReactElement } from "react";
import { useAnnotations } from "../../stores/annotation-store";

interface AnnotationLayerProps {
  currentDrawPath?: string | null;
  currentRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  lassoPath?: string | null;
  eraserPosition?: { x: number; y: number } | null;
  strokeColor?: string;
  strokeWidth?: number;
}

const ERASER_VISUAL_RADIUS = 20;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function renderFreehandAnnotation(
  annotation: SpatialAnnotation,
  isActive: boolean
): ReactElement | null {
  const svgPath = annotation.label;
  if (!svgPath) {
    return null;
  }

  return (
    <path
      d={svgPath}
      fill={annotation.color ?? "#3b82f6"}
      fillOpacity={0.15}
      key={annotation.id}
      stroke={annotation.color ?? "#3b82f6"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={annotation.strokeWidth ?? 2}
      style={
        isActive
          ? { filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" }
          : undefined
      }
    />
  );
}

function renderRectangleAnnotation(
  annotation: SpatialAnnotation,
  isActive: boolean
): ReactElement | null {
  if (annotation.points.length < 2) {
    return null;
  }

  const xs = annotation.points.map((p) => p.x);
  const ys = annotation.points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;

  return (
    <rect
      fill={annotation.color ?? "#3b82f6"}
      fillOpacity={0.08}
      height={height}
      key={annotation.id}
      rx={2}
      stroke={annotation.color ?? "#3b82f6"}
      strokeDasharray="6 3"
      strokeWidth={1.5}
      style={
        isActive
          ? { filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" }
          : undefined
      }
      width={width}
      x={x}
      y={y}
    />
  );
}

function renderArrowAnnotation(
  annotation: SpatialAnnotation,
  isActive: boolean
): ReactElement | null {
  if (annotation.points.length < 2) {
    return null;
  }

  const start = annotation.points[0] as { x: number; y: number };
  const end = annotation.points.at(-1);
  if (!end) {
    return null;
  }
  const markerId = `arrow-${annotation.id}`;

  return (
    <g key={annotation.id}>
      <defs>
        <marker
          id={markerId}
          markerHeight="7"
          markerWidth="10"
          orient="auto"
          refX="9"
          refY="3.5"
        >
          <polygon
            fill={annotation.color ?? "#3b82f6"}
            points="0 0, 10 3.5, 0 7"
          />
        </marker>
      </defs>
      <line
        markerEnd={`url(#${markerId})`}
        stroke={annotation.color ?? "#3b82f6"}
        strokeWidth={annotation.strokeWidth ?? 2}
        style={
          isActive
            ? { filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" }
            : undefined
        }
        x1={start.x}
        x2={end.x}
        y1={start.y}
        y2={end.y}
      />
    </g>
  );
}

function renderTextAnnotation(
  annotation: SpatialAnnotation,
  isActive: boolean
): ReactElement | null {
  if (annotation.points.length === 0 || !annotation.label) {
    return null;
  }

  const position = annotation.points[0] as { x: number; y: number };

  return (
    <foreignObject
      height={40}
      key={annotation.id}
      style={
        isActive
          ? { filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" }
          : undefined
      }
      width={200}
      x={position.x}
      y={position.y}
    >
      <div
        style={{
          color: annotation.color ?? "#3b82f6",
          fontSize: 14,
          fontFamily: "system-ui, sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        {annotation.label}
      </div>
    </foreignObject>
  );
}

function renderAnnotation(
  annotation: SpatialAnnotation,
  isActive: boolean
): ReactElement | null {
  switch (annotation.type) {
    case "freehand":
      return renderFreehandAnnotation(annotation, isActive);
    case "rectangle":
      return renderRectangleAnnotation(annotation, isActive);
    case "arrow":
      return renderArrowAnnotation(annotation, isActive);
    case "text":
      return renderTextAnnotation(annotation, isActive);
    default:
      return null;
  }
}

export const AnnotationLayer = memo(function AnnotationLayerComponent({
  currentDrawPath,
  currentRect,
  lassoPath,
  eraserPosition,
  strokeColor = "#3b82f6",
  strokeWidth = 2,
}: AnnotationLayerProps) {
  const annotations = useAnnotations();
  const transform = useStore((s) => s.transform);
  const reduced = prefersReducedMotion();

  const [tx, ty, scale] = transform;

  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
        {annotations.map((annotation) => renderAnnotation(annotation, false))}

        {currentDrawPath && (
          <path
            d={currentDrawPath}
            fill={strokeColor}
            fillOpacity={0.15}
            stroke={strokeColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            style={
              reduced
                ? undefined
                : { filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" }
            }
          />
        )}

        {currentRect && (
          <rect
            fill={strokeColor}
            fillOpacity={0.08}
            height={currentRect.height}
            rx={2}
            stroke={strokeColor}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            width={currentRect.width}
            x={currentRect.x}
            y={currentRect.y}
          />
        )}

        {lassoPath && (
          <path
            d={lassoPath}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeDasharray="4 2"
            strokeWidth={1}
          />
        )}

        {eraserPosition && (
          <circle
            cx={eraserPosition.x}
            cy={eraserPosition.y}
            fill="rgba(239, 68, 68, 0.1)"
            r={ERASER_VISUAL_RADIUS}
            stroke="#ef4444"
            strokeDasharray="3 2"
            strokeWidth={1}
          />
        )}
      </g>
    </svg>
  );
});
AnnotationLayer.displayName = "AnnotationLayer";

export type { AnnotationLayerProps };
