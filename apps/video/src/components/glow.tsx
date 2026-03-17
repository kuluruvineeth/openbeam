import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BRAND } from "../lib/theme";

interface GlowProps {
  startFrame?: number;
  size?: number;
  color?: string;
  x?: string;
  y?: string;
}

export const Glow: React.FC<GlowProps> = ({
  startFrame = 0,
  size = 400,
  color = BRAND.blue,
  x = "50%",
  y = "50%",
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 30, startFrame + 60],
    [0, 0.4, 0.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(frame, [startFrame, startFrame + 40], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        filter: `blur(${size * 0.3}px)`,
        pointerEvents: "none",
      }}
    />
  );
};
