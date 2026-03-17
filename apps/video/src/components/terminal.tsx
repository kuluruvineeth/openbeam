import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface TerminalLine {
  type: "command" | "output" | "comment";
  text: string;
  delay?: number;
}

interface TerminalProps {
  lines: TerminalLine[];
  startFrame: number;
  typingSpeed?: number;
  prompt?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

const DOT_SIZE = 10;
const DOT_GAP = 8;
const TITLE_HEIGHT = 36;

const DOTS: Array<{ color: string }> = [
  { color: "#ff5f57" },
  { color: "#febc2e" },
  { color: "#28c840" },
];

function computeLineTimings(
  lines: TerminalLine[],
  startFrame: number,
  typingSpeed: number
): Array<{ line: TerminalLine; start: number; end: number }> {
  const result: Array<{ line: TerminalLine; start: number; end: number }> = [];
  let cursor = startFrame;

  for (const line of lines) {
    const lineStart = cursor + (line.delay ?? 0);
    const charCount = line.type === "command" ? line.text.length : 0;
    const typingDuration = charCount * typingSpeed;
    const lineEnd = lineStart + typingDuration;
    result.push({ line, start: lineStart, end: lineEnd });
    cursor = lineEnd + (line.type === "command" ? 4 : 0);
  }

  return result;
}

export const Terminal: React.FC<TerminalProps> = ({
  lines,
  startFrame,
  typingSpeed = 1.5,
  prompt = "$ ",
  width = 720,
  height = 420,
  style,
}) => {
  const frame = useCurrentFrame();
  const timings = computeLineTimings(lines, startFrame, typingSpeed);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        border: `1px solid ${BRAND.border}`,
        overflow: "hidden",
        background: BRAND.bg,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          height: TITLE_HEIGHT,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
          borderBottom: `1px solid ${BRAND.border}`,
        }}
      >
        <div style={{ display: "flex", gap: DOT_GAP }}>
          {DOTS.map((dot) => (
            <div
              key={dot.color}
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: "50%",
                backgroundColor: dot.color,
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: 16,
          fontFamily: FONTS.mono,
          fontSize: 14,
          lineHeight: 1.7,
          overflow: "hidden",
        }}
      >
        {timings.map((entry, i) => {
          const { line, start, end } = entry;

          if (frame < start) {
            return null;
          }

          if (line.type === "comment") {
            const opacity = interpolate(frame, [start, start + 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div key={i} style={{ color: BRAND.fgDim, opacity }}>
                {line.text}
              </div>
            );
          }

          if (line.type === "output") {
            const opacity = interpolate(frame, [start, start + 4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div key={i} style={{ color: BRAND.fgMuted, opacity }}>
                {line.text}
              </div>
            );
          }

          const charsVisible = Math.floor(
            interpolate(frame, [start, end], [0, line.text.length], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          );

          const typed = line.text.slice(0, charsVisible);
          const showCursor = frame < end;

          return (
            <div key={i} style={{ display: "flex" }}>
              <span style={{ color: BRAND.green }}>{prompt}</span>
              <span style={{ color: BRAND.fg }}>{typed}</span>
              {showCursor && (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 16,
                    background: BRAND.fg,
                    marginLeft: 1,
                    opacity: Math.round(frame / 15) % 2 === 0 ? 1 : 0,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
