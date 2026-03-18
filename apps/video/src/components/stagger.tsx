import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface StaggerProps {
  startFrame: number;
  staggerFrames?: number;
  from?: "bottom" | "left" | "right" | "top";
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function getTranslate(
  direction: "bottom" | "left" | "right" | "top",
  offset: number
): string {
  switch (direction) {
    case "bottom":
      return `translateY(${offset}px)`;
    case "top":
      return `translateY(${-offset}px)`;
    case "left":
      return `translateX(${-offset}px)`;
    case "right":
      return `translateX(${offset}px)`;
  }
  return "translateY(0px)";
}

export const Stagger: React.FC<StaggerProps> = ({
  startFrame,
  staggerFrames = 8,
  from = "bottom",
  distance = 30,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = React.Children.toArray(children);

  return (
    <div style={style}>
      {items.map((child, i) => {
        const itemStart = startFrame + i * staggerFrames;
        const progress = spring({
          frame: frame - itemStart,
          fps,
          config: { damping: 26, stiffness: 140, mass: 0.7 },
        });

        const offset = interpolate(progress, [0, 1], [distance, 0]);
        const opacity = interpolate(progress, [0, 0.5], [0, 1], {
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={i}
            style={{
              transform: getTranslate(from, offset),
              opacity,
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};
