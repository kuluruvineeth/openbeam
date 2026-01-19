"use client";

import { useMemo } from "react";

import { cn } from "../../utils/cn";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  fillOpacity?: number;
  className?: string;
}

function Sparkline({
  data,
  width = 100,
  height = 32,
  strokeWidth = 1.5,
  color = "currentColor",
  fillOpacity = 0.1,
  className,
}: SparklineProps) {
  const { path, fillPath } = useMemo(() => {
    if (data.length < 2) {
      return { path: "", fillPath: "" };
    }

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padding = 2;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
      const y =
        height - padding - ((value - minVal) / range) * (height - padding * 2);
      return { x, y };
    });

    const linePath = points
      .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const lastPoint = points.at(-1) as { x: number; y: number };
    const firstPoint = points.at(0) as { x: number; y: number };
    const areaPath = `${linePath} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;

    return { path: linePath, fillPath: areaPath };
  }, [data, width, height]);

  if (data.length < 2) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className={cn("overflow-visible", className)}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <path d={fillPath} fill={color} fillOpacity={fillOpacity} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

export { Sparkline };
export type { SparklineProps };
