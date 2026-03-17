import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

interface ParallaxLayerProps {
  depth: number;
  direction?: "vertical" | "horizontal";
  amplitude?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  depth,
  direction = "vertical",
  amplitude = 40,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const speed = 1 - depth;
  const t = (frame / fps) * Math.PI * 2 * 0.1;
  const displacement = Math.sin(t) * amplitude * speed;

  const transform =
    direction === "vertical"
      ? `translateY(${displacement}px)`
      : `translateX(${displacement}px)`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform,
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
