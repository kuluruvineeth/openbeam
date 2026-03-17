import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface TextRevealProps {
  text: string;
  startFrame: number;
  mode?: "chars" | "words" | "lines";
  staggerFrames?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  style?: React.CSSProperties;
}

const WHITESPACE_SPLIT_REGEX = /(\s+)/;
const WHITESPACE_TEST_REGEX = /^\s+$/;

function splitUnits(text: string, mode: "chars" | "words" | "lines"): string[] {
  if (mode === "chars") {
    return text.split("");
  }
  if (mode === "words") {
    return text.split(WHITESPACE_SPLIT_REGEX);
  }
  return text.split("\n");
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  startFrame,
  mode = "chars",
  staggerFrames = 2,
  fontSize = 64,
  fontFamily = FONTS.sans,
  color = BRAND.fg,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const units = splitUnits(text, mode);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        fontSize,
        fontFamily,
        color,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {units.map((unit, i) => {
        const unitStart = startFrame + i * staggerFrames;
        const progress = spring({
          frame: frame - unitStart,
          fps,
          config: { damping: 28, stiffness: 180, mass: 0.6 },
        });

        const translateY = interpolate(progress, [0, 1], [20, 0]);
        const opacity = interpolate(progress, [0, 0.6], [0, 1], {
          extrapolateRight: "clamp",
        });

        const isWhitespace = WHITESPACE_TEST_REGEX.test(unit);

        if (isWhitespace) {
          return (
            <span key={i} style={{ whiteSpace: "pre" }}>
              {unit}
            </span>
          );
        }

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "bottom",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${translateY}px)`,
                opacity,
                whiteSpace: "pre",
              }}
            >
              {unit}
            </span>
          </span>
        );
      })}
    </div>
  );
};
