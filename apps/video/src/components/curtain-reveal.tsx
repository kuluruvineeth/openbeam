import type React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND } from "../lib/theme";

interface CurtainRevealProps {
  startFrame: number;
  durationFrames?: number;
  color?: string;
  children: React.ReactNode;
}

export const CurtainReveal: React.FC<CurtainRevealProps> = ({
  startFrame,
  durationFrames = 30,
  color = BRAND.bg,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 18, stiffness: 80, mass: 1.2 },
    durationInFrames: durationFrames,
  });

  const leftX = -progress * 50;
  const rightX = progress * 50;

  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            backgroundColor: color,
            transform: `translateX(${leftX}%)`,
            willChange: "transform",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "50%",
            height: "100%",
            backgroundColor: color,
            transform: `translateX(${rightX}%)`,
            willChange: "transform",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
