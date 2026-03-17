import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";

interface ZoomTransitionProps {
  mode: "in" | "out";
  progress: number;
  children: React.ReactNode;
}

export const ZoomTransition: React.FC<ZoomTransitionProps> = ({
  mode,
  progress,
  children,
}) => {
  const t = mode === "out" ? 1 - progress : progress;

  const scale = interpolate(t, [0, 1], [3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blur = interpolate(t, [0, 1], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(t, [0, 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        filter: `blur(${blur}px)`,
        opacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
