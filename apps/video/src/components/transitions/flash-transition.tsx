import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";

interface FlashTransitionProps {
  progress: number;
  color?: string;
  peakFrame?: number;
}

export const FlashTransition: React.FC<FlashTransitionProps> = ({
  progress,
  color = "#ffffff",
  peakFrame = 0.5,
}) => {
  const peak = Math.max(0.01, Math.min(peakFrame, 0.99));

  const opacity = interpolate(progress, [0, peak, 1], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity,
      }}
    />
  );
};
