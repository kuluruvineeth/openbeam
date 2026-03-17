import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface HighlightTextProps {
  text: string;
  startFrame: number;
  highlightColor?: string;
  highlightStyle?: "underline" | "background" | "box";
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  style?: React.CSSProperties;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  startFrame,
  highlightColor = BRAND.yellow,
  highlightStyle = "underline",
  fontSize = 48,
  fontFamily = FONTS.sans,
  color = BRAND.fg,
  style,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const textOpacity = interpolate(frame, [startFrame - 5, startFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const decorationStyle = buildDecoration(
    highlightStyle,
    highlightColor,
    progress,
    fontSize
  );

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        fontSize,
        fontFamily,
        color,
        opacity: textOpacity,
        ...style,
      }}
    >
      {decorationStyle.behind && (
        <span
          style={{
            position: "absolute",
            pointerEvents: "none",
            ...decorationStyle.behind,
          }}
        />
      )}
      <span style={{ position: "relative" }}>{text}</span>
    </span>
  );
};

function buildDecoration(
  variant: "underline" | "background" | "box",
  color: string,
  progress: number,
  fontSize: number
): { behind?: React.CSSProperties } {
  if (variant === "underline") {
    return {
      behind: {
        bottom: 0,
        left: 0,
        height: Math.max(2, fontSize * 0.06),
        width: `${progress * 100}%`,
        backgroundColor: color,
        borderRadius: 1,
      },
    };
  }

  if (variant === "background") {
    return {
      behind: {
        inset: `-${fontSize * 0.1}px -${fontSize * 0.15}px`,
        backgroundColor: color,
        opacity: 0.2,
        borderRadius: BRAND.radius,
        transform: `scaleX(${progress})`,
        transformOrigin: "left center",
      },
    };
  }

  const borderWidth = Math.max(1, fontSize * 0.04);
  const pad = fontSize * 0.12;
  const perimeterProgress = progress;

  return {
    behind: {
      inset: `-${pad}px`,
      border: `${borderWidth}px solid ${color}`,
      borderRadius: BRAND.radius,
      clipPath: `inset(0 ${(1 - perimeterProgress) * 100}% 0 0)`,
    },
  };
}
