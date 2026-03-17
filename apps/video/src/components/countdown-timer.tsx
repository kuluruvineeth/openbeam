import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../lib/theme";

interface CountdownTimerProps {
  from: number;
  to?: number;
  startFrame: number;
  durationFrames: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  format?: "number" | "time";
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  from,
  to = 0,
  startFrame,
  durationFrames,
  fontSize = 120,
  fontFamily = "SF Pro Display, system-ui, sans-serif",
  color = BRAND.fg,
  format = "number",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.max(0, frame - startFrame);
  const range = from - to;
  const framesPerStep = durationFrames / range;
  const stepIndex = Math.min(Math.floor(elapsed / framesPerStep), range);
  const currentValue = from - stepIndex;

  const frameWithinStep = elapsed - stepIndex * framesPerStep;
  const scaleIn = spring({
    frame: frameWithinStep,
    fps,
    config: { damping: 20, stiffness: 200, mass: 0.8 },
    durationInFrames: Math.max(1, Math.floor(framesPerStep * 0.6)),
  });

  const scale = interpolate(scaleIn, [0, 1], [1.4, 1]);
  const opacity = interpolate(scaleIn, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const displayValue = formatValue(currentValue, format);

  if (frame < startFrame || frame >= startFrame + durationFrames) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        fontSize,
        fontWeight: 700,
        color,
        transform: `scale(${scale})`,
        opacity,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {displayValue}
    </div>
  );
};

function formatValue(value: number, format: "number" | "time"): string {
  if (format === "time") {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return String(value);
}
