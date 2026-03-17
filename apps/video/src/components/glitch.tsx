import type React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface GlitchProps {
  startFrame: number;
  durationFrames?: number;
  intensity?: number;
  slices?: number;
  children: React.ReactNode;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49_297) * 49_297;
  return x - Math.floor(x);
}

export const Glitch: React.FC<GlitchProps> = ({
  startFrame,
  durationFrames = 8,
  intensity = 1,
  slices = 5,
  children,
}) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const endFrame = startFrame + durationFrames;
  const isActive = frame >= startFrame && frame < endFrame;

  if (!isActive) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const localFrame = frame - startFrame;
  const sliceHeight = height / slices;
  const maxDisplacement = 40 * intensity;

  return (
    <AbsoluteFill>
      {Array.from({ length: slices }, (_, i) => {
        const y = i * sliceHeight;
        const seed = localFrame * 100 + i;
        const displacement = (seededRandom(seed) * 2 - 1) * maxDisplacement;

        return (
          <AbsoluteFill
            key={i}
            style={{
              clipPath: `inset(${y}px 0 ${height - y - sliceHeight}px 0)`,
              transform: `translateX(${displacement}px)`,
            }}
          >
            {children}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
