import type React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface CounterProps {
  value: string;
  startFrame: number;
  durationFrames?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  style?: React.CSSProperties;
}

const PARSE_VALUE_REGEX = /^([^0-9.-]*)([0-9]+\.?[0-9]*)(.*)$/;

function parseValue(value: string): {
  prefix: string;
  number: number;
  suffix: string;
  decimals: number;
} {
  const match = value.match(PARSE_VALUE_REGEX);
  if (!match) {
    return { prefix: "", number: 0, suffix: value, decimals: 0 };
  }

  const numStr = match[2];
  const dotIndex = numStr.indexOf(".");
  const decimals = dotIndex >= 0 ? numStr.length - dotIndex - 1 : 0;

  return {
    prefix: match[1],
    number: Number.parseFloat(numStr),
    suffix: match[3],
    decimals,
  };
}

export const Counter: React.FC<CounterProps> = ({
  value,
  startFrame,
  durationFrames = 45,
  fontSize = 72,
  fontFamily = FONTS.mono,
  color = BRAND.fg,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { prefix, number, suffix, decimals } = parseValue(value);

  const countProgress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const currentNumber = countProgress * number;
  const displayNumber =
    decimals > 0
      ? currentNumber.toFixed(decimals)
      : Math.round(currentNumber).toLocaleString();

  const endFrame = startFrame + durationFrames;
  const pulseProgress = spring({
    frame: frame - endFrame,
    fps,
    config: { damping: 20, stiffness: 300, mass: 0.5 },
  });

  const pulse =
    frame >= endFrame
      ? interpolate(pulseProgress, [0, 0.5, 1], [1, 1.03, 1])
      : 1;

  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontSize,
        fontFamily,
        color,
        fontVariantNumeric: "tabular-nums",
        transform: `scale(${pulse})`,
        opacity,
        ...style,
      }}
    >
      {prefix}
      {displayNumber}
      {suffix}
    </div>
  );
};
