import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../lib/theme";

interface MorphingBlobProps {
  size?: number;
  color?: string;
  speed?: number;
  complexity?: number;
  opacity?: number;
  x?: string;
  y?: string;
}

interface BlobPathParams {
  frame: number;
  fps: number;
  size: number;
  complexity: number;
  speed: number;
}

function blobPath({
  frame,
  fps,
  size,
  complexity,
  speed,
}: BlobPathParams): string {
  const t = (frame / fps) * speed;
  const radius = size / 2;
  const center = radius;
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < complexity; i += 1) {
    const angle = (i / complexity) * Math.PI * 2;
    const wobble =
      Math.sin(t * 1.3 + i * 2.1) * 0.15 +
      Math.sin(t * 0.7 + i * 3.4) * 0.1 +
      Math.sin(t * 2.1 + i * 1.7) * 0.05;
    const r = radius * (0.7 + 0.3 * (1 + wobble));
    points.push({
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    });
  }

  const segments: string[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const prev = points[(i - 1 + points.length) % points.length];
    const nextNext = points[(i + 2) % points.length];

    const cp1x = curr.x + (next.x - prev.x) / 4;
    const cp1y = curr.y + (next.y - prev.y) / 4;
    const cp2x = next.x - (nextNext.x - curr.x) / 4;
    const cp2y = next.y - (nextNext.y - curr.y) / 4;

    if (i === 0) {
      segments.push(`M ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`);
    }
    segments.push(
      `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`
    );
  }

  return `${segments.join(" ")} Z`;
}

export const MorphingBlob: React.FC<MorphingBlobProps> = ({
  size = 300,
  color = BRAND.pink,
  speed = 1,
  complexity = 6,
  opacity = 0.6,
  x = "50%",
  y = "50%",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clampedComplexity = Math.max(3, Math.min(8, complexity));
  const d = blobPath({
    frame,
    fps,
    size,
    complexity: clampedComplexity,
    speed,
  });

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
    <svg
      height={size}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      <path d={d} fill={color} opacity={opacity} />
    </svg>
  );
};
