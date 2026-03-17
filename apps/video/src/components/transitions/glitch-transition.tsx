import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";

interface GlitchTransitionProps {
  progress: number;
  intensity?: number;
}

const SLICE_COUNT = 12;

function seededRandom(seed: number): number {
  const n = Math.sin(seed * 127.1 + 311.7) * 43_758.5453;
  return n - Math.floor(n);
}

export const GlitchTransition: React.FC<GlitchTransitionProps> = ({
  progress,
  intensity = 1,
}) => {
  const glitchAmount = interpolate(
    progress,
    [0, 0.35, 0.4, 0.5, 0.6, 0.65, 1],
    [0, 0, 1, 1, 1, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (glitchAmount === 0) {
    return null;
  }

  const flashOpacity = interpolate(progress, [0.45, 0.5, 0.55], [0, 0.8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rgbSplit = 8 * glitchAmount * intensity;

  const slices: React.ReactNode[] = [];
  const sliceHeight = 100 / SLICE_COUNT;

  for (let i = 0; i < SLICE_COUNT; i += 1) {
    const rand = seededRandom(i + Math.round(progress * 10));
    const displacement = (rand - 0.5) * 60 * glitchAmount * intensity;
    const top = i * sliceHeight;

    slices.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${top}%`,
          height: `${sliceHeight + 0.5}%`,
          background: `linear-gradient(90deg,
            rgba(255,0,0,0.15) 0%,
            transparent 30%,
            transparent 70%,
            rgba(0,0,255,0.15) 100%)`,
          transform: `translateX(${displacement}px)`,
        }}
      />
    );
  }

  return (
    <>
      <AbsoluteFill
        style={{
          boxShadow: `${rgbSplit}px 0 0 rgba(255,0,0,0.3), ${-rgbSplit}px 0 0 rgba(0,0,255,0.3)`,
          overflow: "hidden",
        }}
      >
        {slices}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundColor: "#fff",
          opacity: flashOpacity,
        }}
      />
    </>
  );
};
