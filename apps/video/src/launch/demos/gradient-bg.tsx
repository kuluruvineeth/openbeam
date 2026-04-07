import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

const VARIANTS = {
  midnight: {
    bg: "#0a0a0f",
    orbs: [
      { color: "59, 130, 246", x: 30, y: 35 },
      { color: "139, 92, 246", x: 70, y: 60 },
      { color: "59, 130, 246", x: 55, y: 25 },
    ],
  },
  warm: {
    bg: "#0a0908",
    orbs: [
      { color: "245, 158, 11", x: 35, y: 40 },
      { color: "234, 88, 12", x: 65, y: 55 },
      { color: "245, 158, 11", x: 50, y: 30 },
    ],
  },
  deep: {
    bg: "#060608",
    orbs: [
      { color: "30, 30, 50", x: 40, y: 45 },
      { color: "20, 20, 40", x: 60, y: 55 },
    ],
  },
} as const;

type Variant = keyof typeof VARIANTS;

interface GradientBgProps {
  variant?: Variant;
  opacity?: number;
  speed?: number;
}

export const GradientBg: React.FC<GradientBgProps> = ({
  variant = "midnight",
  opacity = 0.15,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const t = frame * speed * 0.006;
  const config = VARIANTS[variant];

  return (
    <AbsoluteFill style={{ background: config.bg, overflow: "hidden" }}>
      {config.orbs.map((orb, i) => {
        const angle = (i / config.orbs.length) * Math.PI * 2;
        const cx = orb.x + Math.sin(t + angle) * 8;
        const cy = orb.y + Math.cos(t * 0.7 + angle) * 6;
        const scale = 0.9 + Math.sin(t * 0.4 + i * 1.8) * 0.1;
        const orbOpacity = opacity * (0.7 + 0.3 * Math.sin(t * 0.3 + i * 2));

        return (
          <div
            key={`${orb.color}-${i}`}
            style={{
              position: "absolute",
              left: `${cx}%`,
              top: `${cy}%`,
              width: 900,
              height: 900,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${orb.color}, ${orbOpacity}) 0%, transparent 70%)`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              filter: "blur(140px)",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

interface FilmGrainProps {
  opacity?: number;
  speed?: number;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  opacity = 0.04,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame * speed) % 1000;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay" }}>
      <svg
        aria-hidden="true"
        height="100%"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id={`grain-${seed}`}>
          <feTurbulence
            baseFrequency="0.65"
            numOctaves="3"
            seed={seed}
            stitchTiles="stitch"
            type="fractalNoise"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          filter={`url(#grain-${seed})`}
          height="100%"
          opacity={opacity}
          width="100%"
        />
      </svg>
    </AbsoluteFill>
  );
};

interface VignetteProps {
  intensity?: number;
  color?: string;
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.6,
  color = "0,0,0",
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(${color}, ${intensity}) 100%)`,
      pointerEvents: "none",
    }}
  />
);
