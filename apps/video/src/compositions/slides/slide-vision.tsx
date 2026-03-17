import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BlurReveal,
  CameraMove,
  Counter,
  FilmBars,
  GradientBg,
  GrainOverlay,
  MorphingBlob,
  ParticleField,
  PulseRing,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

const _ScrambleText: React.FC<{
  text: string;
  startFrame: number;
  settleFrame: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  settleFrame,
  fontSize,
  fontFamily,
  color,
  style,
}) => {
  const frame = useCurrentFrame();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  if (frame < startFrame) {
    return (
      <span style={{ fontSize, fontFamily, color, opacity: 0, ...style }}>
        {text}
      </span>
    );
  }

  if (frame >= settleFrame) {
    return (
      <span style={{ fontSize, fontFamily, color, ...style }}>{text}</span>
    );
  }

  const progress = (frame - startFrame) / (settleFrame - startFrame);
  const scrambled = text
    .split("")
    .map((ch, i) => {
      if (ch === " ") {
        return " ";
      }
      const charProgress = i / text.length;
      if (progress > charProgress + 0.3) {
        return ch;
      }
      return chars[Math.floor(Math.random() * chars.length)];
    })
    .join("");

  return (
    <span style={{ fontSize, fontFamily, color, ...style }}>{scrambled}</span>
  );
};

const HighlightText: React.FC<{
  text: string;
  startFrame: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  style?: React.CSSProperties;
}> = ({ text, startFrame, fontSize, fontFamily, color, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.8 },
  });

  const glowOpacity = interpolate(progress, [0, 0.5, 1], [0, 0.4, 0.2]);
  const textOpacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          inset: "-8px -16px",
          background: `radial-gradient(ellipse, ${BRAND.blue}30 0%, transparent 70%)`,
          filter: "blur(12px)",
          opacity: glowOpacity,
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          fontSize,
          fontFamily,
          color,
          opacity: textOpacity,
          position: "relative",
          ...style,
        }}
      >
        {text}
      </span>
    </span>
  );
};

const PulseGradientLine: React.FC<{
  startFrame: number;
  y: number;
  left: number;
  right: number;
}> = ({ startFrame, y, left, right }) => {
  const frame = useCurrentFrame();

  const lineProgress = interpolate(
    frame,
    [startFrame, startFrame + 40],
    [0, 100],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    }
  );

  const pulsePhase = interpolate(
    frame,
    [startFrame + 40, startFrame + 200],
    [0, 3],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const pulseX = (Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5) * 100;

  if (lineProgress < 1) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left,
        width: right - left,
        height: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${lineProgress}%`,
          height: "100%",
          background: `linear-gradient(to right, ${BRAND.fgMuted}40, ${BRAND.fg}20)`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${pulseX}%`,
            top: -1,
            width: 40,
            height: 3,
            background: `radial-gradient(ellipse, ${BRAND.fg}80 0%, transparent 100%)`,
            transform: "translateX(-50%)",
            filter: "blur(1px)",
          }}
        />
      </div>
    </div>
  );
};

interface MilestoneProps {
  phase: string;
  tam: string;
  description: string;
  startFrame: number;
  bright?: boolean;
  tamFontSize?: number;
}

const MilestoneNode: React.FC<MilestoneProps> = ({
  phase,
  tam,
  description,
  startFrame,
  bright = false,
  tamFontSize = 24,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });

  const blur = interpolate(progress, [0, 1], [16, 0]);
  const nodeOpacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const borderColor = bright ? `${BRAND.fg}cc` : `${BRAND.fg}4d`;
  const topBorderColor = bright ? `${BRAND.fg}e6` : `${BRAND.fg}66`;
  const tamOpacity = bright ? 1 : 0.6;
  const dimNodeSize = tamFontSize > 24 ? 120 : 112;
  const nodeSize = bright ? 130 : dimNodeSize;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        opacity: nodeOpacity,
        filter: `blur(${blur}px)`,
        willChange: "filter, opacity",
        position: "relative",
      }}
    >
      <div
        style={{
          width: nodeSize,
          height: nodeSize,
          borderRadius: 6,
          border: `1px solid ${borderColor}`,
          borderTop: `2px solid ${topBorderColor}`,
          background: BRAND.card,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Counter
          color={BRAND.fg}
          durationFrames={30}
          fontFamily={FONTS.mono}
          fontSize={tamFontSize}
          startFrame={startFrame + 5}
          style={{ fontWeight: 600, opacity: tamOpacity }}
          value={tam}
        />
      </div>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          fontWeight: 500,
          color: BRAND.fg,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          marginTop: 16,
        }}
      >
        {phase}
      </span>
      <span
        style={{
          fontFamily: FONTS.sans,
          fontSize: 11,
          fontWeight: 400,
          color: `${BRAND.fg}b3`,
          maxWidth: 140,
          lineHeight: 1.4,
          marginTop: 6,
        }}
      >
        {description}
      </span>
    </div>
  );
};

export const SlideVision: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = fadeIn * fadeOut;

  const headlineText =
    "When robots need to understand a building, a process, or an organization — they query";
  const openbeamStart = 30 + 16 * 6;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity }}>
        <GradientBg
          colors={[
            BRAND.blue,
            BRAND.pink,
            BRAND.green,
            BRAND.orange,
            BRAND.yellow,
          ]}
          opacity={0.04}
          speed={0.4}
        />
        <ParticleField count={120} opacity={0.08} size={1} speed={0.1} />
        <GrainOverlay opacity={0.04} />

        <MorphingBlob
          color={BRAND.blue}
          opacity={0.06}
          size={200}
          speed={0.5}
          x="730px"
          y="530px"
        />
        <MorphingBlob
          color={BRAND.pink}
          opacity={0.05}
          size={180}
          speed={0.6}
          x="960px"
          y="530px"
        />
        <MorphingBlob
          color={BRAND.green}
          opacity={0.04}
          size={220}
          speed={0.4}
          x="1190px"
          y="530px"
        />

        {frame >= 100 && (
          <PulseRing
            color={BRAND.blue}
            count={2}
            size={160}
            staggerFrames={8}
            startFrame={100}
            x={730}
            y={530}
          />
        )}
        {frame >= 115 && (
          <PulseRing
            color={BRAND.pink}
            count={2}
            size={180}
            staggerFrames={8}
            startFrame={115}
            x={960}
            y={530}
          />
        )}
        {frame >= 130 && (
          <PulseRing
            color={BRAND.green}
            count={2}
            size={200}
            staggerFrames={8}
            startFrame={130}
            x={1190}
            y={530}
          />
        )}

        <CameraMove
          durationFrames={240}
          intensity={0.4}
          startFrame={0}
          type="zoom"
        >
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 80,
              right: 80,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <BlurReveal maxBlur={12} startFrame={20}>
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
                VISION
              </span>
            </BlurReveal>
            <BlurReveal maxBlur={10} startFrame={20}>
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  fontWeight: 400,
                  color: BRAND.fgMuted,
                }}
              >
                OpenBeam
              </span>
            </BlurReveal>
          </div>

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "100px 120px 80px",
            }}
          >
            <div style={{ maxWidth: 1000, textAlign: "center" }}>
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={52}
                mode="words"
                staggerFrames={6}
                startFrame={30}
                style={{
                  justifyContent: "center",
                  textAlign: "center",
                  lineHeight: 1.25,
                  display: "inline-flex",
                  flexWrap: "wrap",
                }}
                text={headlineText}
              />
              <span style={{ display: "inline-block", marginLeft: 12 }}>
                <HighlightText
                  color={BRAND.fg}
                  fontFamily={FONTS.serif}
                  fontSize={52}
                  startFrame={openbeamStart}
                  style={{ fontWeight: 400, lineHeight: 1.25 }}
                  text=" OpenBeam."
                />
              </span>
            </div>

            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                width: "100%",
                maxWidth: 700,
                marginTop: 72,
              }}
            >
              <PulseGradientLine
                left={125}
                right={575}
                startFrame={90}
                y={65}
              />

              <MilestoneNode
                description="Enterprise search"
                phase="NOW"
                startFrame={100}
                tam="$7B"
              />
              <MilestoneNode
                description="Physical operations platform"
                phase="YEAR 2-3"
                startFrame={115}
                tam="$50B+"
                tamFontSize={28}
              />
              <MilestoneNode
                bright
                description="OS for robots and physical AI"
                phase="YEAR 5+"
                startFrame={130}
                tam="$143B"
                tamFontSize={32}
              />
            </div>

            <div style={{ marginTop: 72, maxWidth: 860, textAlign: "center" }}>
              <BlurReveal maxBlur={14} startFrame={160}>
                <p
                  style={{
                    fontFamily: FONTS.serif,
                    fontSize: 28,
                    fontWeight: 400,
                    color: BRAND.fgMuted,
                    lineHeight: 1.6,
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  AWS started as cheap servers. Stripe as seven lines of code.
                  OpenBeam starts as the{" "}
                  <HighlightText
                    color={BRAND.fg}
                    fontFamily={FONTS.serif}
                    fontSize={28}
                    startFrame={175}
                    style={{ fontStyle: "italic", fontWeight: 400 }}
                    text="search layer for the physical world"
                  />
                  .
                </p>
              </BlurReveal>
            </div>
          </div>
        </CameraMove>

        <FilmBars ratio={2.35} />
        <Vignette intensity={0.4} size={0.35} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
