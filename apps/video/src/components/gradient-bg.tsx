import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BRAND } from "../lib/theme";

interface GradientBgProps {
  colors?: string[];
  speed?: number;
  opacity?: number;
}

const DEFAULT_COLORS = [BRAND.blue, BRAND.pink, BRAND.green, BRAND.orange];

function hexToRgba(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const GradientBg: React.FC<GradientBgProps> = ({
  colors = DEFAULT_COLORS,
  speed = 1,
  opacity = 0.08,
}) => {
  const frame = useCurrentFrame();
  const t = frame * speed * 0.008;

  const blobs = colors.map((color, i) => {
    const angle = (i / colors.length) * Math.PI * 2;
    const cx = 50 + Math.sin(t + angle) * 25;
    const cy = 50 + Math.cos(t * 0.7 + angle) * 20;
    const scale = 0.8 + Math.sin(t * 0.5 + i * 1.5) * 0.2;
    const blobOpacity = opacity * (0.6 + 0.4 * Math.sin(t * 0.3 + i * 2));

    return {
      key: i,
      cx,
      cy,
      scale,
      color: hexToRgba(color, blobOpacity),
    };
  });

  return (
    <AbsoluteFill style={{ background: BRAND.bg, overflow: "hidden" }}>
      {blobs.map((blob) => (
        <div
          key={blob.key}
          style={{
            position: "absolute",
            left: `${blob.cx}%`,
            top: `${blob.cy}%`,
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            transform: `translate(-50%, -50%) scale(${blob.scale})`,
            filter: "blur(120px)",
            pointerEvents: "none",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
