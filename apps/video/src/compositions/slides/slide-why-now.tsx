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
  ColorGrade,
  Counter,
  GradientBg,
  GrainOverlay,
  ParticleField,
  PulseRing,
  ScrambleText,
  Stagger,
  TextReveal,
  Vignette,
  ZoomBurst,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

interface WhyNowStatProps {
  category: string;
  value: string;
  description: string;
  sub: string;
  borderColor: string;
  startFrame: number;
  pulseX: number;
  pulseY: number;
}

const BORDER_HEIGHT = 80;

const WhyNowStat: React.FC<WhyNowStatProps> = ({
  category,
  value,
  description,
  sub,
  borderColor,
  startFrame,
  pulseX,
  pulseY,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const borderProgress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 26, stiffness: 120, mass: 0.7 },
  });
  const borderHeight = interpolate(borderProgress, [0, 1], [0, BORDER_HEIGHT]);

  const descProgress = spring({
    frame: frame - (startFrame + 15),
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const descOpacity = interpolate(descProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const descY = interpolate(descProgress, [0, 1], [12, 0]);

  const subProgress = spring({
    frame: frame - (startFrame + 25),
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const subOpacity = interpolate(subProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const burstScale = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 200, mass: 0.5 },
  });
  const entryScale = interpolate(burstScale, [0, 0.5, 1], [1.15, 1.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entryOpacity = interpolate(burstScale, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const scrambleSettled = frame >= startFrame + 20;

  return (
    <div
      style={{
        flex: 1,
        transform: `scale(${entryScale})`,
        opacity: entryOpacity,
        transformOrigin: "center top",
      }}
    >
      <ScrambleText
        color={`${BRAND.fg}99`}
        durationFrames={16}
        fontFamily={FONTS.mono}
        fontSize={12}
        startFrame={startFrame - 8}
        style={{
          fontWeight: 500,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
        text={category}
      />

      <div style={{ display: "flex", gap: 0, position: "relative" }}>
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
              style={{
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
              value={value}
            />
          ) : (
            <ScrambleText
              charset="0123456789%+TBKM"
              color={BRAND.fg}
              durationFrames={20}
              fontFamily={FONTS.mono}
              fontSize={56}
              startFrame={startFrame}
              style={{
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
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
                fontSize: 15,
                fontWeight: 400,
                color: BRAND.fgMuted,
                lineHeight: 1.5,
                margin: "12px 0 0 0",
                maxWidth: 300,
              }}
            >
              {description}
            </p>
          </div>
          <div style={{ opacity: subOpacity }}>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                fontWeight: 400,
                color: `${BRAND.fgMuted}99`,
                letterSpacing: "0.06em",
                marginTop: 8,
                display: "block",
                maxWidth: 320,
                lineHeight: 1.4,
              }}
            >
              {sub}
            </span>
          </div>
        </div>

        <PulseRing
          color={`${borderColor}60`}
          count={3}
          size={200}
          staggerFrames={6}
          startFrame={startFrame + 5}
          x={pulseX}
          y={pulseY}
        />
      </div>
    </div>
  );
};

export const SlideWhyNow: React.FC = () => {
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
    frame: frame - 65,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const subtextOpacity = interpolate(subtextProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity: masterFadeIn * masterFadeOut }}>
        <ColorGrade intensity={0.4} preset="warm">
          <CameraMove
            durationFrames={240}
            intensity={0.3}
            startFrame={0}
            type="dolly"
          >
            <AbsoluteFill>
              <GradientBg
                colors={[BRAND.yellow, BRAND.green]}
                opacity={0.06}
                speed={0.7}
              />

              <ParticleField count={60} opacity={0.1} size={1.2} speed={0.2} />

              <GrainOverlay opacity={0.035} />

              <ZoomBurst
                color={`${BRAND.blue}40`}
                durationFrames={20}
                lineCount={16}
                maxLength={200}
                opacity={0.3}
                startFrame={90}
                x={320}
                y={720}
              />
              <ZoomBurst
                color={`${BRAND.orange}40`}
                durationFrames={20}
                lineCount={16}
                maxLength={200}
                opacity={0.3}
                startFrame={105}
                x={960}
                y={720}
              />
              <ZoomBurst
                color={`${BRAND.green}40`}
                durationFrames={20}
                lineCount={16}
                maxLength={200}
                opacity={0.3}
                startFrame={120}
                x={1600}
                y={720}
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
                    Why Now
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
                <div style={{ maxWidth: 1000 }}>
                  <TextReveal
                    color={BRAND.fg}
                    fontFamily={FONTS.serif}
                    fontSize={64}
                    mode="chars"
                    staggerFrames={2}
                    startFrame={30}
                    style={{
                      lineHeight: 1.15,
                      letterSpacing: "-0.01em",
                      fontWeight: 400,
                    }}
                    text="Robots are shipping."
                  />
                </div>

                <div style={{ maxWidth: 1000, marginTop: 8 }}>
                  <TextReveal
                    color={`${BRAND.fg}cc`}
                    fontFamily={FONTS.serif}
                    fontSize={64}
                    mode="chars"
                    staggerFrames={2}
                    startFrame={50}
                    style={{
                      lineHeight: 1.15,
                      letterSpacing: "-0.01em",
                      fontWeight: 400,
                    }}
                    text="Their data has nowhere to go."
                  />
                </div>

                <div
                  style={{
                    opacity: subtextOpacity,
                    marginTop: 20,
                    maxWidth: 700,
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
                    Physical AI is deploying at factory scale. Every machine
                    generates terabytes no platform can ingest. Regulation is
                    forcing data processing on-prem. And the 30-year incumbents
                    are retreating — PTC is divesting ThingWorx for $725M.
                  </p>
                </div>

                <Stagger
                  distance={30}
                  from="left"
                  staggerFrames={6}
                  startFrame={80}
                  style={{
                    display: "flex",
                    gap: 48,
                    marginTop: 64,
                  }}
                >
                  <WhyNowStat
                    borderColor={BRAND.blue}
                    category="Deploying at scale"
                    description="Industrial robots deployed worldwide"
                    pulseX={30}
                    pulseY={40}
                    startFrame={90}
                    sub="$40.7B robotics VC in 2025. Goldman revised humanoid TAM 6x to $38B."
                    value="750K+"
                  />
                  <WhyNowStat
                    borderColor={BRAND.orange}
                    category="Data tsunami"
                    description="Per autonomous vehicle — 99% goes unused"
                    pulseX={30}
                    pulseY={40}
                    startFrame={105}
                    sub="A fleet of 1,000 robots generates petabytes per week."
                    value="19 TB/hr"
                  />
                  <WhyNowStat
                    borderColor={BRAND.green}
                    category="Forced on-prem"
                    description="Of CIOs planning cloud repatriation"
                    pulseX={30}
                    pulseY={40}
                    startFrame={120}
                    sub="DORA live. CMMC Phase 1 live. EU AI Act enforcing Aug 2026."
                    value="86%"
                  />
                </Stagger>
              </div>

              <Vignette intensity={0.35} size={0.3} />
            </AbsoluteFill>
          </CameraMove>
        </ColorGrade>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
