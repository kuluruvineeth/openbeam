import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { BRAND } from "../lib/theme";

interface SparklineProps {
  data: number[];
  startFrame: number;
  durationFrames?: number;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
}

function buildPolylinePoints(
  data: number[],
  width: number,
  height: number,
  padding: number
): string {
  if (data.length === 0) {
    return "";
  }
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;
  const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);
  const usableHeight = height - padding * 2;

  return data
    .map((val, i) => {
      const x = padding + i * stepX;
      const y =
        padding + usableHeight - ((val - minVal) / range) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildFillPath(
  data: number[],
  width: number,
  height: number,
  padding: number
): string {
  if (data.length === 0) {
    return "";
  }
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;
  const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);
  const usableHeight = height - padding * 2;

  const points = data.map((val, i) => {
    const x = padding + i * stepX;
    const y = padding + usableHeight - ((val - minVal) / range) * usableHeight;
    return `${x},${y}`;
  });

  const lastX = padding + (data.length - 1) * stepX;
  const firstX = padding;
  const bottom = height - padding;

  return `M ${firstX},${bottom} L ${points.join(" L ")} L ${lastX},${bottom} Z`;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  startFrame,
  durationFrames = 30,
  width = 200,
  height = 60,
  color = BRAND.blue,
  strokeWidth = 2,
  fill = false,
}) => {
  const frame = useCurrentFrame();
  const padding = 4;

  if (data.length === 0) {
    return null;
  }

  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const visibleCount = Math.max(1, Math.ceil(data.length * progress));
  const visibleData = data.slice(0, visibleCount);

  const polylinePoints = buildPolylinePoints(
    visibleData,
    width,
    height,
    padding
  );
  const fillPath = fill
    ? buildFillPath(visibleData, width, height, padding)
    : "";
  const gradientId = `sparkline-fill-${startFrame}`;

  const opacity = interpolate(frame, [startFrame, startFrame + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
    <svg height={height} style={{ opacity }} width={width}>
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && fillPath && <path d={fillPath} fill={`url(#${gradientId})`} />}
      <polyline
        fill="none"
        points={polylinePoints}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};
