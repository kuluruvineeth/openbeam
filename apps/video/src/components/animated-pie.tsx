import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

interface PieChartProps {
  segments: Array<{ value: number; color: string; label?: string }>;
  startFrame: number;
  size?: number;
  donut?: boolean;
  strokeWidth?: number;
  staggerFrames?: number;
}

export const AnimatedPie: React.FC<PieChartProps> = ({
  segments,
  startFrame,
  size = 200,
  donut = true,
  strokeWidth = 30,
  staggerFrames = 8,
}) => {
  const frame = useCurrentFrame();
  const center = size / 2;
  const radius = donut ? (size - strokeWidth) / 2 : size * 0.4;
  const circumference = 2 * Math.PI * radius;

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return null;
  }

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let accumulatedOffset = 0;

  const renderedSegments = segments.map((segment, i) => {
    const segmentFraction = segment.value / total;
    const segmentLength = circumference * segmentFraction;
    const segmentStart = startFrame + i * staggerFrames;

    const drawProgress = interpolate(
      frame,
      [segmentStart, segmentStart + staggerFrames + 15],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      }
    );

    const visibleLength = segmentLength * drawProgress;
    const gapSize = segments.length > 1 ? 2 : 0;
    const dashArray = `${Math.max(0, visibleLength - gapSize)} ${circumference - Math.max(0, visibleLength - gapSize)}`;
    const rotation = (accumulatedOffset / circumference) * 360 - 90;

    accumulatedOffset += segmentLength;

    if (donut) {
      return (
        <circle
          cx={center}
          cy={center}
          fill="none"
          key={segment.color + String(i)}
          r={radius}
          stroke={segment.color}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(${rotation} ${center} ${center})`}
        />
      );
    }

    const startAngle =
      ((accumulatedOffset - segmentLength) / circumference) * 360 - 90;
    const endAngle = startAngle + segmentFraction * 360 * drawProgress;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const d = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return (
      <path
        d={d}
        fill={segment.color}
        key={segment.color + String(i)}
        stroke="none"
      />
    );
  });

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
    <svg height={size} style={{ opacity }} width={size}>
      {renderedSegments}
    </svg>
  );
};
