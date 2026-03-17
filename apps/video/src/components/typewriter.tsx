import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface TypewriterProps {
  text: string;
  startFrame: number;
  speed?: number;
  cursor?: boolean;
  cursorChar?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  style?: React.CSSProperties;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  startFrame,
  speed = 0.5,
  cursor = true,
  cursorChar = "|",
  fontSize = 48,
  fontFamily = FONTS.mono,
  color = BRAND.fg,
  style,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(text.length, Math.floor(elapsed * speed));
  const visibleText = text.slice(0, charCount);
  const isComplete = charCount >= text.length;

  const blinkVisible = Math.round(((frame - startFrame) % 16) / 16) === 0;
  const cursorOpacity = cursor && blinkVisible ? 1 : 0;

  const showCursor = cursor && (isComplete ? cursorOpacity : 1);

  const opacity = interpolate(frame, [startFrame, startFrame + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontSize,
        fontFamily,
        color,
        whiteSpace: "pre-wrap",
        opacity,
        ...style,
      }}
    >
      {visibleText}
      {cursor && <span style={{ opacity: showCursor }}>{cursorChar}</span>}
    </div>
  );
};
