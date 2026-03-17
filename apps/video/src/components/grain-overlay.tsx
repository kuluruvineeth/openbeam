import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

interface GrainOverlayProps {
  opacity?: number;
  speed?: number;
}

export const GrainOverlay: React.FC<GrainOverlayProps> = ({
  opacity = 0.04,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame * speed) % 100;

  const offsetX = (seed * 7.3) % 100;
  const offsetY = (seed * 13.7) % 100;

  const noiseSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' seed='${seed}' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='1'/></svg>`;
  const encoded = `url("data:image/svg+xml,${encodeURIComponent(noiseSvg)}")`;

  return (
    <AbsoluteFill
      style={{
        backgroundImage: encoded,
        backgroundSize: "200px 200px",
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};
