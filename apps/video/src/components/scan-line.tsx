import type React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../lib/theme";

interface ScanLineProps {
  startFrame: number;
  durationFrames?: number;
  color?: string;
  thickness?: number;
  glowSize?: number;
}

export const ScanLine: React.FC<ScanLineProps> = ({
  startFrame,
  durationFrames = 60,
  color = BRAND.blue,
  thickness = 2,
  glowSize = 30,
}) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    }
  );

  const y = progress * height;

  const lineOpacity = interpolate(
    frame,
    [
      startFrame,
      startFrame + 5,
      startFrame + durationFrames - 5,
      startFrame + durationFrames,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (frame < startFrame || frame > startFrame + durationFrames) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        height: thickness,
        background: color,
        boxShadow: `0 0 ${glowSize}px ${glowSize / 2}px ${color}60, 0 0 ${glowSize * 2}px ${glowSize}px ${color}20`,
        opacity: lineOpacity,
        pointerEvents: "none",
      }}
    />
  );
};
