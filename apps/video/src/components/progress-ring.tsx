import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface ProgressRingProps {
  value: number;
  startFrame: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  showValue?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  startFrame,
  size = 120,
  strokeWidth = 4,
  color = BRAND.blue,
  bgColor = BRAND.border,
  label,
  showValue = true,
}) => {
  const frame = useCurrentFrame();
  const clampedValue = Math.min(100, Math.max(0, value));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progress = interpolate(frame, [startFrame, startFrame + 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const currentValue = clampedValue * progress;
  const dashOffset = circumference * (1 - currentValue / 100);

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        opacity,
      }}
    >
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
      <svg height={size} width={size}>
        <circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {showValue && (
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: size * 0.22,
              color: BRAND.fg,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(currentValue)}%
          </span>
        )}
        {label && (
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: size * 0.11,
              color: BRAND.fgMuted,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
