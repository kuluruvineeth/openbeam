import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { BRAND } from "../lib/theme";

interface PulseRingProps {
  startFrame: number;
  x: number;
  y: number;
  color?: string;
  size?: number;
  count?: number;
  staggerFrames?: number;
}

export const PulseRing: React.FC<PulseRingProps> = ({
  startFrame,
  x,
  y,
  color = BRAND.blue,
  size = 200,
  count = 3,
  staggerFrames = 10,
}) => {
  const frame = useCurrentFrame();

  const rings = Array.from({ length: count }, (_, i) => {
    const ringStart = startFrame + i * staggerFrames;
    const ringDuration = 40;

    const progress = interpolate(
      frame,
      [ringStart, ringStart + ringDuration],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      }
    );

    const radius = interpolate(progress, [0, 1], [0, size / 2]);
    const ringOpacity = interpolate(progress, [0, 0.3, 1], [0, 0.8, 0]);
    const strokeW = interpolate(progress, [0, 1], [3, 1]);

    if (frame < ringStart) {
      return null;
    }

    return (
      <circle
        cx={x}
        cy={y}
        fill="none"
        key={i}
        opacity={ringOpacity}
        r={radius}
        stroke={color}
        strokeWidth={strokeW}
      />
    );
  });

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {rings}
    </svg>
  );
};
