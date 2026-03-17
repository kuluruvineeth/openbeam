import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../lib/theme";

interface ParticleFieldProps {
  count?: number;
  color?: string;
  speed?: number;
  opacity?: number;
  size?: number;
}

function seededPosition(index: number, seed: number): { x: number; y: number } {
  const a = Math.sin(index * 127.1 + seed * 311.7) * 43_758.5453;
  const b = Math.sin(index * 269.5 + seed * 183.3) * 43_758.5453;
  return {
    x: a - Math.floor(a),
    y: b - Math.floor(b),
  };
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 60,
  color = BRAND.fg,
  speed = 0.3,
  opacity = 0.15,
  size = 1.5,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame * speed * 0.01;

  const particles = Array.from({ length: count }, (_, i) => {
    const base = seededPosition(i, 0);
    const driftX = Math.sin(t + i * 0.7) * 30 * speed;
    const driftY = Math.cos(t + i * 1.3) * 20 * speed;
    const parallax = 0.5 + (i % 3) * 0.25;

    const x = (((base.x * width + driftX * parallax) % width) + width) % width;
    const y =
      (((base.y * height + driftY * parallax) % height) + height) % height;
    const particleOpacity =
      opacity * (0.4 + 0.6 * Math.sin(t * 2 + i * 0.5) * 0.5 + 0.5);
    const r = size * (0.6 + 0.4 * parallax);

    return { x, y, opacity: particleOpacity, r, key: i };
  });

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
    <svg
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      width={width}
    >
      {particles.map((p) => (
        <circle
          cx={p.x}
          cy={p.y}
          fill={color}
          key={p.key}
          opacity={p.opacity}
          r={p.r}
        />
      ))}
    </svg>
  );
};
