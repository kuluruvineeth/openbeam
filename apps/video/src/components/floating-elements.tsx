import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

interface FloatingElement {
  content: React.ReactNode;
  x: number;
  y: number;
  size?: number;
  speed?: number;
}

interface FloatingElementsProps {
  elements: FloatingElement[];
  amplitude?: number;
}

export const FloatingElements: React.FC<FloatingElementsProps> = ({
  elements,
  amplitude = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {elements.map((el, i) => {
        const speed = el.speed ?? 1;
        const phase = i * 1.8;
        const bobY =
          Math.sin(t * speed * 0.8 + phase) * amplitude +
          Math.sin(t * speed * 1.6 + phase * 0.7) * amplitude * 0.3;
        const bobX = Math.cos(t * speed * 0.6 + phase + 1) * amplitude * 0.4;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${el.x}%`,
              top: `${el.y}%`,
              transform: `translate(-50%, -50%) translate(${bobX}px, ${bobY}px)`,
              fontSize: el.size ?? 24,
            }}
          >
            {el.content}
          </div>
        );
      })}
    </div>
  );
};
