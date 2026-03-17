import type React from "react";
import { AbsoluteFill } from "remotion";

interface VignetteProps {
  intensity?: number;
  size?: number;
  color?: string;
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.4,
  size = 0.3,
  color = "#000000",
}) => {
  const innerStop = Math.round((1 - size) * 100);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, transparent ${innerStop}%, ${color} 100%)`,
        opacity: intensity,
        pointerEvents: "none",
      }}
    />
  );
};
