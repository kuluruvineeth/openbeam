import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";

interface SwipeTransitionProps {
  progress: number;
  angle?: number;
  edgeColor?: string;
  edgeWidth?: number;
  children: React.ReactNode;
}

export const SwipeTransition: React.FC<SwipeTransitionProps> = ({
  progress,
  angle = 15,
  edgeColor = "#ffffff",
  edgeWidth = 3,
  children,
}) => {
  const sweep = interpolate(progress, [0, 1], [-120, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rad = (angle * Math.PI) / 180;
  const skew = Math.tan(rad) * 100;

  const left = sweep;
  const leftSkewed = sweep + skew;

  return (
    <>
      <AbsoluteFill
        style={{
          clipPath: `polygon(${left}% 0%, 100% 0%, 100% 100%, ${leftSkewed}% 100%)`,
        }}
      >
        {children}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: `polygon(${left}% 0%, ${left + edgeWidth}% 0%, ${leftSkewed + edgeWidth}% 100%, ${leftSkewed}% 100%)`,
          backgroundColor: edgeColor,
          opacity: interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </>
  );
};
