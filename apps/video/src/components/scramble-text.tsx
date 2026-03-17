import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface ScrambleTextProps {
  text: string;
  startFrame: number;
  durationFrames?: number;
  charset?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  style?: React.CSSProperties;
}

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";

function deterministicChar(charset: string, seed: number): string {
  const index =
    (((seed * 7919 + 104_729) % charset.length) + charset.length) %
    charset.length;
  return charset[index];
}

export const ScrambleText: React.FC<ScrambleTextProps> = ({
  text,
  startFrame,
  durationFrames = 30,
  charset = DEFAULT_CHARSET,
  fontSize = 48,
  fontFamily = FONTS.mono,
  color = BRAND.fg,
  style,
}) => {
  const frame = useCurrentFrame();
  const charCount = text.length;

  const globalProgress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = interpolate(frame, [startFrame, startFrame + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const chars: string[] = [];
  for (let i = 0; i < charCount; i += 1) {
    const settleThreshold = (i + 1) / charCount;

    if (globalProgress >= settleThreshold) {
      chars.push(text[i]);
    } else if (globalProgress <= 0) {
      chars.push(text[i] === " " ? " " : deterministicChar(charset, i));
    } else if (text[i] === " ") {
      chars.push(" ");
    } else {
      const seed = i * 1000 + frame;
      chars.push(deterministicChar(charset, seed));
    }
  }

  return (
    <div
      style={{
        fontSize,
        fontFamily,
        color,
        whiteSpace: "pre-wrap",
        opacity,
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      {chars.join("")}
    </div>
  );
};
