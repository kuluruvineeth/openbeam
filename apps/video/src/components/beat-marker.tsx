import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface BeatMarkerProps {
  frames: number[];
  type?: "flash" | "pulse" | "shake" | "zoom";
  intensity?: number;
  children: React.ReactNode;
}

const EFFECT_DURATION = 6;

export const BeatMarker: React.FC<BeatMarkerProps> = ({
  frames,
  type = "pulse",
  intensity = 1,
  children,
}) => {
  const frame = useCurrentFrame();

  const activeBeat = findActiveBeat(frames, frame);
  if (activeBeat < 0) {
    return <div>{children}</div>;
  }

  const elapsed = frame - activeBeat;
  const progress = Math.min(elapsed / EFFECT_DURATION, 1);
  const effectStyle = buildBeatStyle(type, progress, intensity);

  return <div style={effectStyle}>{children}</div>;
};

function findActiveBeat(beats: number[], frame: number): number {
  for (let i = beats.length - 1; i >= 0; i -= 1) {
    const beat = beats[i];
    if (frame >= beat && frame < beat + EFFECT_DURATION) {
      return beat;
    }
  }
  return -1;
}

function buildBeatStyle(
  type: BeatMarkerProps["type"],
  progress: number,
  intensity: number
): React.CSSProperties {
  const decay = 1 - progress;

  switch (type) {
    case "flash": {
      const brightness = 1 + decay * 0.5 * intensity;
      return { filter: `brightness(${brightness})` };
    }
    case "pulse": {
      const scale = 1 + decay * 0.03 * intensity;
      return { transform: `scale(${scale})` };
    }
    case "shake": {
      const offset =
        progress < 0.5
          ? interpolate(
              progress,
              [0, 0.25, 0.5],
              [0, 4 * intensity, -4 * intensity]
            )
          : interpolate(
              progress,
              [0.5, 0.75, 1],
              [-4 * intensity, 2 * intensity, 0]
            );
      return { transform: `translateX(${offset}px)` };
    }
    case "zoom": {
      const scale = 1 + decay * 0.05 * intensity;
      return { transform: `scale(${scale})` };
    }
    default:
      return {};
  }
}
