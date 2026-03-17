import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

interface PerspectiveCardProps {
  children: React.ReactNode;
  rotateX?: number;
  rotateY?: number;
  depth?: number;
  animated?: boolean;
  style?: React.CSSProperties;
}

export const PerspectiveCard: React.FC<PerspectiveCardProps> = ({
  children,
  rotateX = 0,
  rotateY = 0,
  depth = 1000,
  animated = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let rx = rotateX;
  let ry = rotateY;

  if (animated) {
    const t = (frame / fps) * 0.5;
    rx = rotateX + Math.sin(t * Math.PI * 2) * 5;
    ry = rotateY + Math.cos(t * Math.PI * 2 * 0.7) * 5;
  }

  return (
    <div style={{ perspective: depth, ...style }}>
      <div
        style={{
          transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
};
