import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface ToastProps {
  title: string;
  body: string;
  icon?: React.ReactNode;
  startFrame: number;
  durationFrames?: number;
  position?: "top-right" | "bottom-right" | "top-center";
  style?: React.CSSProperties;
}

const TOAST_WIDTH = 340;
const SLIDE_DISTANCE = 60;

function positionStyles(
  position: "top-right" | "bottom-right" | "top-center"
): React.CSSProperties {
  switch (position) {
    case "top-right":
      return { top: 20, right: 20 };
    case "bottom-right":
      return { bottom: 20, right: 20 };
    case "top-center":
      return { top: 20, left: "50%", transform: "translateX(-50%)" };
    default:
      break;
  }
}

export const NotificationToast: React.FC<ToastProps> = ({
  title,
  body,
  icon,
  startFrame,
  durationFrames = 90,
  position = "top-right",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 22, stiffness: 160, mass: 0.7 },
  });

  const exitStart = startFrame + durationFrames;
  const exitProgress = spring({
    frame: frame - exitStart,
    fps,
    config: { damping: 26, stiffness: 200, mass: 0.6 },
  });

  if (frame < startFrame) {
    return null;
  }

  const isHorizontal = position !== "top-center";
  const enterOffset = interpolate(enterProgress, [0, 1], [SLIDE_DISTANCE, 0]);
  const exitOffset = interpolate(exitProgress, [0, 1], [0, SLIDE_DISTANCE]);
  const offset = frame >= exitStart ? exitOffset : enterOffset;

  const enterOpacity = interpolate(enterProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(exitProgress, [0, 0.6], [1, 0], {
    extrapolateRight: "clamp",
  });
  const opacity = frame >= exitStart ? exitOpacity : enterOpacity;

  const translateX = isHorizontal ? offset : 0;
  const translateY = isHorizontal ? 0 : -offset;

  const posStyles = positionStyles(position);
  const needsTranslateXCenter = position === "top-center";

  return (
    <div
      style={{
        position: "absolute",
        ...posStyles,
        width: TOAST_WIDTH,
        transform: needsTranslateXCenter
          ? `translateX(-50%) translate(${translateX}px, ${translateY}px)`
          : `translate(${translateX}px, ${translateY}px)`,
        opacity,
        zIndex: 100,
        ...style,
      }}
    >
      <div
        style={{
          background: BRAND.card,
          border: `1px solid ${BRAND.border}`,
          borderRadius: 8,
          padding: 14,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          boxShadow: `0 4px 12px ${BRAND.bg}80`,
        }}
      >
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: BRAND.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 14,
              fontWeight: 500,
              color: BRAND.fg,
              lineHeight: 1.3,
              marginBottom: 3,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 12,
              color: BRAND.fgMuted,
              lineHeight: 1.4,
            }}
          >
            {body}
          </div>
        </div>
      </div>
    </div>
  );
};
