import type React from "react";
import { useCurrentFrame } from "remotion";

export type CameraKeyframe = {
  frame: number;
  x: number;
  y: number;
  scale: number;
};

function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function lerpKeyframes(
  frame: number,
  keyframes: CameraKeyframe[]
): { x: number; y: number; scale: number } {
  if (keyframes.length === 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  const first = keyframes[0];
  if (frame <= first.frame) {
    return { x: first.x, y: first.y, scale: first.scale };
  }

  const lastIdx = keyframes.length - 1;
  const last = keyframes[lastIdx];
  if (frame >= last.frame) {
    return { x: last.x, y: last.y, scale: last.scale };
  }

  let a = first;
  let b = last;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    if (frame >= keyframes[i].frame && frame < keyframes[i + 1].frame) {
      a = keyframes[i];
      b = keyframes[i + 1];
      break;
    }
  }

  const raw = (frame - a.frame) / (b.frame - a.frame);
  const t = smoothstep(raw);

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    scale: a.scale + (b.scale - a.scale) * t,
  };
}

type CameraProps = {
  keyframes: CameraKeyframe[];
  width: number;
  height: number;
  children: React.ReactNode;
};

export const Camera: React.FC<CameraProps> = ({
  keyframes,
  width,
  height,
  children,
}) => {
  const frame = useCurrentFrame();
  const raw = lerpKeyframes(frame, keyframes);
  const { scale } = raw;

  const halfVisW = width / (2 * scale);
  const halfVisH = height / (2 * scale);
  const x = Math.max(halfVisW, Math.min(width - halfVisW, raw.x));
  const y = Math.max(halfVisH, Math.min(height - halfVisH, raw.y));

  const offsetX = width / 2 - x * scale;
  const offsetY = height / 2 - y * scale;

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
          width,
          height,
          position: "absolute",
        }}
      >
        {children}
      </div>
    </div>
  );
};
