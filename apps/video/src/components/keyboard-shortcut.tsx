import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface KeyboardShortcutProps {
  keys: string[];
  startFrame: number;
  staggerFrames?: number;
  size?: number;
}

const KEY_PADDING_H = 14;
const KEY_PADDING_V = 8;
const KEY_RADIUS = 6;
const KEY_GAP = 6;

export const KeyboardShortcut: React.FC<KeyboardShortcutProps> = ({
  keys,
  startFrame,
  staggerFrames = 6,
  size = 28,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", gap: KEY_GAP, alignItems: "center" }}>
      {keys.map((key, i) => {
        const keyStart = startFrame + i * staggerFrames;

        const enterProgress = spring({
          frame: frame - keyStart,
          fps,
          config: { damping: 18, stiffness: 260, mass: 0.5 },
        });

        const pressDelay = 4;
        const pressProgress = spring({
          frame: frame - (keyStart + pressDelay),
          fps,
          config: { damping: 14, stiffness: 300, mass: 0.4 },
        });

        const opacity = interpolate(enterProgress, [0, 0.3], [0, 1], {
          extrapolateRight: "clamp",
        });

        const enterScale = interpolate(enterProgress, [0, 1], [0.7, 1]);
        const pressScale =
          frame >= keyStart + pressDelay
            ? interpolate(pressProgress, [0, 0.5, 1], [0.92, 0.92, 1])
            : 1;
        const scale = enterScale * pressScale;

        const pressY =
          frame >= keyStart + pressDelay
            ? interpolate(pressProgress, [0, 0.5, 1], [2, 2, 0])
            : 0;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: size,
              height: size,
              paddingLeft: KEY_PADDING_H,
              paddingRight: KEY_PADDING_H,
              paddingTop: KEY_PADDING_V,
              paddingBottom: KEY_PADDING_V,
              borderRadius: KEY_RADIUS,
              background: BRAND.card,
              border: `1px solid ${BRAND.border}`,
              boxShadow: `0 2px 0 ${BRAND.border}`,
              fontFamily: FONTS.mono,
              fontSize: size * 0.5,
              color: BRAND.fg,
              opacity,
              transform: `scale(${scale}) translateY(${pressY}px)`,
            }}
          >
            {key}
          </div>
        );
      })}
    </div>
  );
};
