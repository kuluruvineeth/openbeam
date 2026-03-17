import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface MotionTrailProps {
  startFrame: number;
  copies?: number;
  fadeStep?: number;
  offsetStep?: number;
  direction?: "left" | "right" | "up" | "down";
  children: React.ReactNode;
}

const DIRECTION_VECTORS: Record<string, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

export const MotionTrail: React.FC<MotionTrailProps> = ({
  startFrame,
  copies = 5,
  fadeStep = 0.15,
  offsetStep = 8,
  direction = "left",
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 150, mass: 0.7 },
  });

  const trailIntensity = interpolate(progress, [0, 0.8, 1], [1, 0.4, 0], {
    extrapolateRight: "clamp",
  });

  const vec = DIRECTION_VECTORS[direction];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {Array.from({ length: copies }, (_, i) => {
        const copyIndex = copies - i;
        const offset = copyIndex * offsetStep * trailIntensity;
        const opacity = Math.max(0, 1 - copyIndex * fadeStep) * trailIntensity;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${vec.x * offset}px, ${vec.y * offset}px)`,
              opacity,
              pointerEvents: "none",
            }}
          >
            {children}
          </div>
        );
      })}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};
