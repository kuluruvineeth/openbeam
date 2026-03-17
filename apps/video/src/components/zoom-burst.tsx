import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../lib/theme";

interface ZoomBurstProps {
  startFrame: number;
  durationFrames?: number;
  x?: number;
  y?: number;
  lineCount?: number;
  color?: string;
  maxLength?: number;
  opacity?: number;
}

export const ZoomBurst: React.FC<ZoomBurstProps> = ({
  startFrame,
  durationFrames = 30,
  x = 960,
  y = 540,
  lineCount = 24,
  color = BRAND.fg,
  maxLength = 400,
  opacity = 0.6,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
    <svg
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      width={width}
    >
      {Array.from({ length: lineCount }, (_, i) => {
        const angle = (i / lineCount) * Math.PI * 2;
        const stagger = i * 1.5;
        const elapsed = frame - startFrame - stagger;

        const progress = spring({
          frame: elapsed,
          fps,
          config: { damping: 25, stiffness: 160, mass: 0.6 },
        });

        const fadeProgress = interpolate(
          elapsed,
          [0, durationFrames * 0.6, durationFrames],
          [0, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const innerRadius = 20 + progress * 60;
        const length = progress * maxLength;

        const x1 = x + Math.cos(angle) * innerRadius;
        const y1 = y + Math.sin(angle) * innerRadius;
        const x2 = x + Math.cos(angle) * (innerRadius + length);
        const y2 = y + Math.sin(angle) * (innerRadius + length);

        return (
          <line
            key={i}
            opacity={opacity * fadeProgress}
            stroke={color}
            strokeLinecap="round"
            strokeWidth={2}
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
          />
        );
      })}
    </svg>
  );
};
