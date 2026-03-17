import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BlurReveal,
  CameraMove,
  Counter,
  GradientBg,
  GrainOverlay,
  HighlightText,
  ParticleField,
  PulseRing,
  ScanLine,
  ScrambleText,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

interface StatBlockProps {
  value: string;
  description: string;
  source: string;
  borderColor: string;
  startFrame: number;
}

const STAT_LABEL_HEIGHT = 80;

const StatBlock: React.FC<StatBlockProps> = ({
  value,
  description,
  source,
  borderColor,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const borderProgress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 26, stiffness: 120, mass: 0.7 },
  });
  const borderHeight = interpolate(
    borderProgress,
    [0, 1],
    [0, STAT_LABEL_HEIGHT]
  );

  const descProgress = spring({
    frame: frame - (startFrame + 15),
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const descOpacity = interpolate(descProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const descY = interpolate(descProgress, [0, 1], [12, 0]);

  const scrambleSettled = frame >= startFrame + 25;

  return (
    <div style={{ flex: 1, display: "flex", gap: 0 }}>
      <div
        style={{
          width: 2,
          height: borderHeight,
          backgroundColor: borderColor,
          marginRight: 24,
          borderRadius: 1,
        }}
      />
      <div>
        {scrambleSettled ? (
          <Counter
            color={BRAND.fg}
            durationFrames={40}
            fontFamily={FONTS.mono}
            fontSize={56}
            startFrame={startFrame}
            style={{ fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}
            value={value}
          />
        ) : (
          <ScrambleText
            charset="0123456789%$.,TBMK"
            color={BRAND.fg}
            durationFrames={25}
            fontFamily={FONTS.mono}
            fontSize={56}
            startFrame={startFrame}
            style={{ fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}
            text={value}
          />
        )}
        <div
          style={{
            opacity: descOpacity,
            transform: `translateY(${descY}px)`,
          }}
        >
          <p
            style={{
              fontFamily: FONTS.sans,
              fontSize: 14,
              fontWeight: 400,
              color: BRAND.fgMuted,
              lineHeight: 1.5,
              margin: "12px 0 0 0",
              maxWidth: 280,
            }}
          >
            {description}
          </p>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              fontWeight: 400,
              color: `${BRAND.fgMuted}99`,
              letterSpacing: "0.08em",
              marginTop: 8,
              display: "block",
            }}
          >
            {source}
          </span>
        </div>
      </div>
    </div>
  );
};

export const SlideProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterFadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const masterFadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtextProgress = spring({
    frame: frame - 70,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const subtextOpacity = interpolate(subtextProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const pulseStartFrame = 125;

  const glitchLineOpacity = interpolate(
    frame,
    [75, 76, 80, 81],
    [0, 0.8, 0.8, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity: masterFadeIn * masterFadeOut }}>
        <CameraMove
          durationFrames={60}
          intensity={0.02}
          startFrame={85}
          type="shake"
        >
          <AbsoluteFill>
            <GradientBg
              colors={[BRAND.blue, BRAND.pink]}
              opacity={0.05}
              speed={0.8}
            />

            <ParticleField count={50} opacity={0.1} size={1} speed={0.25} />

            <GrainOverlay opacity={0.035} />

            <ScanLine
              color={`${BRAND.blue}cc`}
              durationFrames={50}
              glowSize={40}
              startFrame={20}
              thickness={2}
            />

            <PulseRing
              color={`${BRAND.blue}50`}
              count={3}
              size={160}
              staggerFrames={8}
              startFrame={pulseStartFrame}
              x={190}
              y={680}
            />

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
              <BlurReveal maxBlur={16} startFrame={25}>
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
                  The Problem
                </span>
              </BlurReveal>

              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  fontWeight: 400,
                  color: BRAND.fgMuted,
                  opacity: interpolate(
                    spring({
                      frame: frame - 15,
                      fps,
                      config: { damping: 26, stiffness: 100, mass: 0.8 },
                    }),
                    [0, 0.5],
                    [0, 1],
                    { extrapolateRight: "clamp" }
                  ),
                }}
              >
                OpenBeam
              </span>
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
                padding: "120px 80px 80px",
              }}
            >
              <div style={{ maxWidth: 1100 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                  }}
                >
                  <TextReveal
                    color={BRAND.fg}
                    fontFamily={FONTS.serif}
                    fontSize={64}
                    mode="words"
                    staggerFrames={4}
                    startFrame={35}
                    style={{
                      lineHeight: 1.15,
                      letterSpacing: "-0.01em",
                      fontWeight: 400,
                    }}
                    text="Factories generate"
                  />
                  <div
                    style={{
                      display: "inline-block",
                      marginLeft: 18,
                      marginRight: 18,
                    }}
                  >
                    <HighlightText
                      color={BRAND.fg}
                      fontFamily={FONTS.serif}
                      fontSize={64}
                      highlightColor={BRAND.blue}
                      highlightStyle="underline"
                      startFrame={44}
                      style={{
                        lineHeight: 1.15,
                        letterSpacing: "-0.01em",
                        fontWeight: 400,
                      }}
                      text="1,000x"
                    />
                  </div>
                  <TextReveal
                    color={BRAND.fg}
                    fontFamily={FONTS.serif}
                    fontSize={64}
                    mode="words"
                    staggerFrames={4}
                    startFrame={48}
                    style={{
                      lineHeight: 1.15,
                      letterSpacing: "-0.01em",
                      fontWeight: 400,
                    }}
                    text="more data than Slack."
                  />
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  marginTop: 8,
                  height: 2,
                  overflow: "hidden",
                  maxWidth: 1100,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: 2,
                    background: `linear-gradient(to right, ${BRAND.blue}cc, ${BRAND.pink}cc)`,
                    opacity: glitchLineOpacity,
                  }}
                />
              </div>

              <div style={{ maxWidth: 1100, marginTop: 8 }}>
                <TextReveal
                  color={`${BRAND.fg}cc`}
                  fontFamily={FONTS.serif}
                  fontSize={64}
                  mode="words"
                  staggerFrames={5}
                  startFrame={55}
                  style={{
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    fontWeight: 400,
                  }}
                  text="None of it is searchable."
                />
              </div>

              <div
                style={{
                  opacity: subtextOpacity,
                  marginTop: 20,
                  maxWidth: 760,
                }}
              >
                <p
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 18,
                    fontWeight: 400,
                    color: BRAND.fgMuted,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Every enterprise search company indexes Slack, Google Drive,
                  Jira. None of them can tell you why Line 3 went down, what the
                  robot fleet saw last Tuesday, or whether Building 7's HVAC is
                  degrading. Physical operations generate terabytes per hour —
                  99% is never analyzed.
                </p>
              </div>

              <div style={{ display: "flex", gap: 48, marginTop: 64 }}>
                <StatBlock
                  borderColor={BRAND.blue}
                  description="Of work time lost searching disconnected tools"
                  source="Bloomfire / HBR"
                  startFrame={85}
                  value="35%"
                />
                <StatBlock
                  borderColor={BRAND.pink}
                  description="Lost annually to unplanned downtime"
                  source="Siemens"
                  startFrame={100}
                  value="$1.4T"
                />
                <StatBlock
                  borderColor={BRAND.orange}
                  description="Of industrial sensor data never analyzed"
                  source="McKinsey"
                  startFrame={115}
                  value="99%"
                />
              </div>
            </div>

            <Vignette intensity={0.4} size={0.3} />
          </AbsoluteFill>
        </CameraMove>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
