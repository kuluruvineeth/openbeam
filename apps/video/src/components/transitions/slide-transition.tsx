import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";

interface SlideTransitionProps {
  direction: "left" | "right" | "up" | "down";
  progress: number;
  children: React.ReactNode;
}

const AXIS: Record<SlideTransitionProps["direction"], "X" | "Y"> = {
  left: "X",
  right: "X",
  up: "Y",
  down: "Y",
};

const SIGN: Record<SlideTransitionProps["direction"], number> = {
  left: 1,
  right: -1,
  up: 1,
  down: -1,
};

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  direction,
  progress,
  children,
}) => {
  const offset = interpolate(progress, [0, 1], [100 * SIGN[direction], 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const axis = AXIS[direction];

  return (
    <AbsoluteFill
      style={{
        transform: `translate${axis}(${offset}%)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
