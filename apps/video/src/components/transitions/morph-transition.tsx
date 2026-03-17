import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";

interface MorphTransitionProps {
  progress: number;
  children: React.ReactNode;
}

const FILTER_ID = "morph-turbulence";

export const MorphTransition: React.FC<MorphTransitionProps> = ({
  progress,
  children,
}) => {
  const turbulence = interpolate(progress, [0, 0.5, 1], [0, 0.08, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const displacement = interpolate(progress, [0, 0.5, 1], [0, 120, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(progress, [0, 0.3, 0.7, 1], [1, 0.6, 0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
      <svg height="0" style={{ position: "absolute" }} width="0">
        <defs>
          <filter id={FILTER_ID}>
            <feTurbulence
              baseFrequency={turbulence}
              numOctaves={3}
              result="noise"
              seed={42}
              type="fractalNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacement}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill
        style={{
          filter: turbulence > 0 ? `url(#${FILTER_ID})` : undefined,
          opacity,
        }}
      >
        {children}
      </AbsoluteFill>
    </>
  );
};
