import type React from "react";
import { AbsoluteFill } from "remotion";

interface LensBlurProps {
  radius?: number;
  focusSize?: number;
  children: React.ReactNode;
}

export const LensBlur: React.FC<LensBlurProps> = ({
  radius = 4,
  focusSize = 0.6,
  children,
}) => {
  const innerStop = Math.round(focusSize * 50);
  const outerStop = Math.round(focusSize * 50 + 20);

  const maskId = `lens-blur-mask-${Math.round(focusSize * 100)}-${radius}`;

  return (
    <AbsoluteFill>
      <AbsoluteFill>{children}</AbsoluteFill>

      <AbsoluteFill
        style={{
          backdropFilter: `blur(${radius}px)`,
          WebkitBackdropFilter: `blur(${radius}px)`,
          maskImage: `radial-gradient(ellipse at center, transparent ${innerStop}%, black ${outerStop}%)`,
          WebkitMaskImage: `radial-gradient(ellipse at center, transparent ${innerStop}%, black ${outerStop}%)`,
          pointerEvents: "none",
        }}
      />

      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
      <svg height="0" style={{ position: "absolute" }} width="0">
        <defs>
          <radialGradient id={maskId}>
            <stop offset={`${innerStop}%`} stopColor="white" />
            <stop offset={`${outerStop}%`} stopColor="black" />
          </radialGradient>
        </defs>
      </svg>
    </AbsoluteFill>
  );
};
