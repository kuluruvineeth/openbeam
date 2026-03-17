import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface CodeBlockProps {
  code: string;
  language?: "typescript" | "javascript" | "bash" | "json";
  startFrame: number;
  linesPerFrame?: number;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  width?: number;
  style?: React.CSSProperties;
}

const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "import",
  "export",
  "from",
  "type",
  "interface",
  "async",
  "await",
  "new",
  "class",
  "extends",
  "true",
  "false",
  "null",
  "undefined",
  "typeof",
  "default",
  "switch",
  "case",
  "break",
  "try",
  "catch",
  "throw",
]);

interface TokenSpan {
  text: string;
  color: string;
}

function tokenizeLine(line: string): TokenSpan[] {
  const spans: TokenSpan[] = [];
  const regex =
    /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|(\b[a-zA-Z_$]\w*\b)|(\S)/g;
  let match: RegExpExecArray | null = null;
  let lastIndex = 0;

  match = regex.exec(line);
  while (match !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: line.slice(lastIndex, match.index), color: BRAND.fg });
    }

    const [full, comment, str, num, word] = match;

    if (comment) {
      spans.push({ text: full, color: BRAND.fgMuted });
    } else if (str) {
      spans.push({ text: full, color: BRAND.green });
    } else if (num) {
      spans.push({ text: full, color: BRAND.orange });
    } else if (word && KEYWORDS.has(word)) {
      spans.push({ text: full, color: BRAND.blue });
    } else {
      spans.push({ text: full, color: BRAND.fg });
    }

    lastIndex = match.index + full.length;
    match = regex.exec(line);
  }

  if (lastIndex < line.length) {
    spans.push({ text: line.slice(lastIndex), color: BRAND.fg });
  }

  return spans;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  startFrame,
  linesPerFrame = 0.5,
  showLineNumbers = true,
  highlightLines = [],
  width = 720,
  style,
}) => {
  const frame = useCurrentFrame();
  const lines = code.split("\n");
  const highlightSet = new Set(highlightLines);
  const gutterWidth = showLineNumbers
    ? String(lines.length).length * 10 + 24
    : 0;

  return (
    <div
      style={{
        width,
        borderRadius: 6,
        border: `1px solid ${BRAND.border}`,
        background: BRAND.card,
        padding: 16,
        fontFamily: FONTS.mono,
        fontSize: 14,
        lineHeight: 1.7,
        overflow: "hidden",
        ...style,
      }}
    >
      {lines.map((line, i) => {
        const lineIndex = i + 1;
        const revealAt = startFrame + i / linesPerFrame;
        const opacity = interpolate(frame, [revealAt, revealAt + 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const isHighlighted = highlightSet.has(lineIndex);
        const tokens = tokenizeLine(line);

        return (
          <div
            key={i}
            style={{
              display: "flex",
              opacity,
              background: isHighlighted ? `${BRAND.blue}12` : "transparent",
              marginLeft: -16,
              marginRight: -16,
              paddingLeft: 16,
              paddingRight: 16,
              borderLeft: isHighlighted
                ? `2px solid ${BRAND.blue}`
                : "2px solid transparent",
            }}
          >
            {showLineNumbers && (
              <span
                style={{
                  width: gutterWidth,
                  flexShrink: 0,
                  color: BRAND.fgDim,
                  userSelect: "none",
                  textAlign: "right",
                  paddingRight: 16,
                }}
              >
                {lineIndex}
              </span>
            )}
            <span style={{ whiteSpace: "pre" }}>
              {tokens.map((token, t) => (
                <span key={t} style={{ color: token.color }}>
                  {token.text}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
};
