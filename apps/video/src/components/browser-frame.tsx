import type React from "react";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface BrowserFrameProps {
  url?: string;
  children: React.ReactNode;
  width?: number;
  showControls?: boolean;
  dark?: boolean;
  style?: React.CSSProperties;
}

const DOT_SIZE = 10;
const DOT_GAP = 8;
const TITLE_BAR_HEIGHT = 38;
const URL_BAR_HEIGHT = 30;

const DOTS: Array<{ color: string }> = [
  { color: "#ff5f57" },
  { color: "#febc2e" },
  { color: "#28c840" },
];

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  url = "https://app.openbeam.ai",
  children,
  width = 960,
  showControls = true,
  dark = true,
  style,
}) => {
  const bg = dark ? BRAND.card : "#f5f5f5";
  const borderColor = dark ? BRAND.border : "#d4d4d4";
  const fgColor = dark ? BRAND.fgMuted : "#737373";
  const urlBg = dark ? BRAND.bg : "#e5e5e5";

  return (
    <div
      style={{
        width,
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        overflow: "hidden",
        background: bg,
        ...style,
      }}
    >
      <div
        style={{
          height: TITLE_BAR_HEIGHT,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
          paddingRight: 14,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {showControls && (
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
        )}

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            paddingLeft: showControls ? 0 : undefined,
          }}
        >
          <div
            style={{
              height: URL_BAR_HEIGHT,
              paddingLeft: 14,
              paddingRight: 14,
              borderRadius: 4,
              background: urlBg,
              display: "flex",
              alignItems: "center",
              fontFamily: FONTS.mono,
              fontSize: 12,
              color: fgColor,
              minWidth: 200,
              justifyContent: "center",
            }}
          >
            {url}
          </div>
        </div>

        {showControls && <div style={{ width: DOT_SIZE * 3 + DOT_GAP * 2 }} />}
      </div>

      <div>{children}</div>
    </div>
  );
};
