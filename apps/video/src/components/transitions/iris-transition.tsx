import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";

interface IrisTransitionProps {
  progress: number;
  centerX?: number;
  centerY?: number;
  children: React.ReactNode;
}

export const IrisTransition: React.FC<IrisTransitionProps> = ({
  progress,
  centerX = 50,
  centerY = 50,
  children,
}) => {
  const radius = interpolate(progress, [0, 1], [0, 150], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        clipPath: `circle(${radius}% at ${centerX}% ${centerY}%)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
