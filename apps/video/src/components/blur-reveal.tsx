import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface BlurRevealProps {
  startFrame: number;
  durationFrames?: number;
  maxBlur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const BlurReveal: React.FC<BlurRevealProps> = ({
  startFrame,
  durationFrames = 30,
  maxBlur = 20,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 30, stiffness: 100, mass: 1 },
    durationInFrames: durationFrames,
  });

  const blur = interpolate(progress, [0, 1], [maxBlur, 0]);
  const opacity = interpolate(progress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(progress, [0, 1], [1.05, 1]);

  return (
    <div
      style={{
        filter: `blur(${blur}px)`,
        opacity,
        transform: `scale(${scale})`,
        willChange: "filter, opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
