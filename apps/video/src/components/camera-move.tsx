import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface CameraMoveProps {
  type: "pan" | "zoom" | "shake" | "dolly";
  startFrame: number;
  durationFrames?: number;
  intensity?: number;
  children: React.ReactNode;
}

function shakeOffset(frame: number, seed: number, intensity: number): number {
  return (
    Math.sin(frame * 1.1 + seed) * 3 * intensity +
    Math.sin(frame * 2.3 + seed * 2) * 2 * intensity +
    Math.sin(frame * 4.7 + seed * 3) * 1 * intensity
  );
}

export const CameraMove: React.FC<CameraMoveProps> = ({
  type,
  startFrame,
  durationFrames = 60,
  intensity = 0.5,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = frame - startFrame;
  const progress = interpolate(elapsed, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let transform = "none";

  if (type === "pan") {
    const s = spring({
      frame: elapsed,
      fps,
      config: { damping: 30, stiffness: 120, mass: 0.8 },
    });
    const tx = interpolate(s, [0, 1], [0, 80 * intensity]);
    const ty = interpolate(s, [0, 1], [0, 30 * intensity]);
    transform = `translate(${tx}px, ${ty}px)`;
  }

  if (type === "zoom") {
    const s = spring({
      frame: elapsed,
      fps,
      config: { damping: 40, stiffness: 100, mass: 1 },
    });
    const scale = interpolate(s, [0, 1], [1, 1 + 0.05 * intensity]);
    transform = `scale(${scale})`;
  }

  if (type === "shake") {
    const active = elapsed >= 0 && elapsed <= durationFrames;
    if (active) {
      const decay = 1 - progress;
      const tx = shakeOffset(elapsed, 0, intensity * decay);
      const ty = shakeOffset(elapsed, 100, intensity * decay);
      transform = `translate(${tx}px, ${ty}px)`;
    }
  }

  if (type === "dolly") {
    const s = spring({
      frame: elapsed,
      fps,
      config: { damping: 35, stiffness: 90, mass: 1 },
    });
    const scale = interpolate(s, [0, 1], [1, 1 + 0.08 * intensity]);
    const ty = interpolate(s, [0, 1], [0, -20 * intensity]);
    transform = `scale(${scale}) translateY(${ty}px)`;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
};
