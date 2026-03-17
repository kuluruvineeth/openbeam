import type React from "react";
import { BRAND } from "../lib/theme";

interface PhoneFrameProps {
  children: React.ReactNode;
  width?: number;
  dark?: boolean;
  showNotch?: boolean;
  style?: React.CSSProperties;
}

const ASPECT_RATIO = 19.5 / 9;
const BODY_RADIUS = 40;
const BODY_BORDER = 3;
const SCREEN_INSET = 8;
const NOTCH_WIDTH = 120;
const NOTCH_HEIGHT = 28;

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  width = 375,
  dark = true,
  showNotch = true,
  style,
}) => {
  const height = width * ASPECT_RATIO;
  const borderColor = dark ? BRAND.fgMuted : "#a3a3a3";
  const bodyBg = dark ? "#000000" : "#f5f5f5";
  const screenRadius = BODY_RADIUS - SCREEN_INSET;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: BODY_RADIUS,
        border: `${BODY_BORDER}px solid ${borderColor}`,
        background: bodyBg,
        position: "relative",
        padding: SCREEN_INSET,
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: screenRadius,
          overflow: "hidden",
          position: "relative",
          background: BRAND.bg,
        }}
      >
        {showNotch && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: NOTCH_WIDTH,
              height: NOTCH_HEIGHT,
              borderRadius: NOTCH_HEIGHT / 2,
              background: bodyBg,
              zIndex: 10,
            }}
          />
        )}

        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          {children}
        </div>
      </div>
    </div>
  );
};
