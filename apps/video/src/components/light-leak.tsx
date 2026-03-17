import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

interface LightLeakProps {
  startFrame: number;
  durationFrames?: number;
  color?: string;
  position?: "left" | "right" | "top" | "center";
  intensity?: number;
}

const POSITION_ORIGINS: Record<string, { x: number; y: number }> = {
  left: { x: -20, y: 50 },
  right: { x: 120, y: 50 },
  top: { x: 50, y: -20 },
  center: { x: 50, y: 50 },
};

export const LightLeak: React.FC<LightLeakProps> = ({
  startFrame,
  durationFrames = 30,
  color = "#d4863480",
  position = "left",
  intensity = 0.6,
}) => {
  const frame = useCurrentFrame();
  const endFrame = startFrame + durationFrames;

  if (frame < startFrame || frame > endFrame) {
    return null;
  }

  const origin = POSITION_ORIGINS[position];

  const progress = interpolate(
    frame,
    [
      startFrame,
      startFrame + durationFrames * 0.3,
      endFrame - durationFrames * 0.2,
      endFrame,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const drift = interpolate(frame, [startFrame, endFrame], [0, 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.linear,
  });

  const cx = origin.x + drift;
  const cy = origin.y;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 60% 80% at ${cx}% ${cy}%, ${color}, transparent 70%)`,
        opacity: progress * intensity,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};
