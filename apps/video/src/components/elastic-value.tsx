import type React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

interface ElasticValueProps {
  children: React.ReactNode;
  startFrame: number;
  overshoot?: number;
  bounces?: number;
  style?: React.CSSProperties;
}

function elasticScale(
  progress: number,
  overshoot: number,
  bounces: number
): number {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }

  const decay = Math.exp(-4 * progress);
  const oscillation = Math.sin(progress * Math.PI * bounces * 2);
  return 1 + oscillation * (overshoot - 1) * decay;
}

export const ElasticValue: React.FC<ElasticValueProps> = ({
  children,
  startFrame,
  overshoot = 1.2,
  bounces = 2,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const raw = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 8, stiffness: 200, mass: 0.5 },
  });

  const scale = elasticScale(raw, overshoot, bounces);

  return (
    <span
      style={{
        display: "inline-block",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        ...style,
      }}
    >
      {children}
    </span>
  );
};
