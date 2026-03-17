import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface LogoGridItem {
  name: string;
  color?: string;
}

interface LogoGridProps {
  items: LogoGridItem[];
  startFrame: number;
  staggerFrames?: number;
  columns?: number;
  itemSize?: number;
  style?: React.CSSProperties;
}

const ITEM_GAP = 12;
const ITEM_RADIUS = 6;
const DOT_SIZE = 6;

export const LogoGrid: React.FC<LogoGridProps> = ({
  items,
  startFrame,
  staggerFrames = 4,
  columns = 4,
  itemSize = 120,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridWidth = columns * itemSize + (columns - 1) * ITEM_GAP;

  return (
    <div
      style={{
        width: gridWidth,
        display: "flex",
        flexWrap: "wrap",
        gap: ITEM_GAP,
        ...style,
      }}
    >
      {items.map((item, i) => {
        const itemStart = startFrame + i * staggerFrames;

        const progress = spring({
          frame: frame - itemStart,
          fps,
          config: { damping: 22, stiffness: 150, mass: 0.6 },
        });

        const opacity = interpolate(progress, [0, 0.4], [0, 1], {
          extrapolateRight: "clamp",
        });
        const scale = interpolate(progress, [0, 1], [0.85, 1]);
        const accentColor = item.color ?? BRAND.blue;

        return (
          <div
            key={i}
            style={{
              width: itemSize,
              height: itemSize,
              borderRadius: ITEM_RADIUS,
              border: `1px solid ${BRAND.border}`,
              background: BRAND.card,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <div
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: "50%",
                background: accentColor,
              }}
            />
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                color: BRAND.fgMuted,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                textAlign: "center",
                paddingLeft: 6,
                paddingRight: 6,
              }}
            >
              {item.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
