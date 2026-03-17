import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Glow } from "../../components/glow";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

interface GlowConfig {
  color: string;
  x: string;
  y: string;
  size?: number;
  startFrame?: number;
}

interface SlideLayoutProps {
  label?: string;
  showBrand?: boolean;
  brandText?: string;
  glows?: GlowConfig[];
  dotGrid?: boolean;
  children: React.ReactNode;
}

const FADE_IN_FRAMES = 20;
const FADE_OUT_START = 220;
const FADE_OUT_FRAMES = 20;

const DotGrid: React.FC = () => {
  const dots: React.ReactNode[] = [];
  const spacing = 40;
  const cols = Math.ceil(1920 / spacing);
  const rows = Math.ceil(1080 / spacing);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      dots.push(
        <circle
          cx={c * spacing}
          cy={r * spacing}
          fill={BRAND.fg}
          key={`${r}-${c}`}
          opacity={0.03}
          r={1}
        />
      );
    }
  }

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
    <svg
      height={1080}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      width={1920}
    >
      {dots}
    </svg>
  );
};

export const SlideLayout: React.FC<SlideLayoutProps> = ({
  label,
  showBrand = true,
  brandText = "OpenBeam",
  glows = [],
  dotGrid = false,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, FADE_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [FADE_OUT_START, FADE_OUT_START + FADE_OUT_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = fadeIn * fadeOut;

  const labelProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });

  const labelOpacity = interpolate(labelProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity }}>
        {dotGrid && <DotGrid />}

        {glows.map((glow, i) => (
          <Glow
            color={glow.color}
            key={i}
            size={glow.size ?? 400}
            startFrame={glow.startFrame ?? 10}
            x={glow.x}
            y={glow.y}
          />
        ))}

        {(label || showBrand) && (
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 80,
              right: 80,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              opacity: labelOpacity,
            }}
          >
            {label ? (
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  fontWeight: 500,
                  color: `${BRAND.fg}e6`,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
            ) : (
              <span />
            )}

            {showBrand && (
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  fontWeight: 400,
                  color: BRAND.fgMuted,
                }}
              >
                {brandText}
              </span>
            )}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
