import type React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

interface SplitRevealProps {
  startFrame: number;
  durationFrames?: number;
  direction?: "horizontal" | "vertical";
  children: React.ReactNode;
}

export const SplitReveal: React.FC<SplitRevealProps> = ({
  startFrame,
  direction = "horizontal",
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 22, stiffness: 140, mass: 0.7 },
  });

  const splitPercent = progress * 50;

  const clipA =
    direction === "horizontal"
      ? `inset(0 ${50 - splitPercent}% 0 0)`
      : `inset(0 0 ${50 - splitPercent}% 0)`;

  const clipB =
    direction === "horizontal"
      ? `inset(0 0 0 ${50 - splitPercent}%)`
      : `inset(${50 - splitPercent}% 0 0 0)`;

  const translateA =
    direction === "horizontal"
      ? `translateX(${-splitPercent * 0.5}%)`
      : `translateY(${-splitPercent * 0.5}%)`;

  const translateB =
    direction === "horizontal"
      ? `translateX(${splitPercent * 0.5}%)`
      : `translateY(${splitPercent * 0.5}%)`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: clipA,
          transform: translateA,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: clipB,
          transform: translateB,
        }}
      >
        {children}
      </div>
    </div>
  );
};
