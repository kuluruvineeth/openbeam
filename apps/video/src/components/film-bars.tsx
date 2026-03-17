import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../lib/theme";

interface FilmBarsProps {
  ratio?: number;
  animated?: boolean;
  startFrame?: number;
  color?: string;
}

export const FilmBars: React.FC<FilmBarsProps> = ({
  ratio = 2.35,
  animated = false,
  startFrame = 0,
  color = BRAND.bg,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const targetHeight = (height - width / ratio) / 2;
  const barHeight = Math.max(0, targetHeight);

  let displayHeight = barHeight;

  if (animated) {
    const springValue = spring({
      frame: frame - startFrame,
      fps,
      config: { damping: 18, stiffness: 80, mass: 0.8 },
    });
    displayHeight = interpolate(springValue, [0, 1], [0, barHeight]);
  }

  if (displayHeight < 1) {
    return null;
  }

  const barStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: displayHeight,
    backgroundColor: color,
    pointerEvents: "none",
  };

  return (
    <>
      <div style={{ ...barStyle, top: 0 }} />
      <div style={{ ...barStyle, bottom: 0 }} />
    </>
  );
};
