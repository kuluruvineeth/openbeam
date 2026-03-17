import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  CameraMove,
  FilmBars,
  Glitch,
  GradientBg,
  GrainOverlay,
  MorphingBlob,
  ParticleField,
  ScrambleText,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

export const SlideTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterFadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const masterFadeOut = interpolate(frame, [200, 220], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const grainOpacity = interpolate(frame, [0, 20], [0, 0.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const particleOpacity = interpolate(frame, [10, 40], [0, 0.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const gradientOpacity = interpolate(frame, [15, 45], [0, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 22, stiffness: 60, mass: 1.2 },
  });
  const logoBlur = interpolate(logoProgress, [0, 1], [30, 0]);
  const logoScale = interpolate(logoProgress, [0, 1], [1.1, 1]);
  const logoOpacity = interpolate(logoProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  const blobOpacity = interpolate(frame, [10, 35], [0, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scrambleSettled = frame >= 50;

  const lineProgress = spring({
    frame: frame - 70,
    fps,
    config: { damping: 30, stiffness: 120, mass: 0.6 },
  });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 200]);

  const footerOpacity = interpolate(
    spring({
      frame: frame - 110,
      fps,
      config: { damping: 26, stiffness: 100, mass: 0.8 },
    }),
    [0, 0.6],
    [0, 0.6],
    { extrapolateRight: "clamp" }
  );

  const seedOpacity = interpolate(
    spring({
      frame: frame - 120,
      fps,
      config: { damping: 26, stiffness: 100, mass: 0.8 },
    }),
    [0, 0.5],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const glitchStart = 52;
  const glitchEnd = glitchStart + 4;
  const isGlitchActive = frame >= glitchStart && frame < glitchEnd;

  const titleContent = (
    <AbsoluteFill style={{ opacity: masterFadeIn * masterFadeOut }}>
      <GradientBg
        colors={[BRAND.blue, BRAND.pink]}
        opacity={gradientOpacity}
        speed={1.2}
      />

      <MorphingBlob
        color={`${BRAND.pink}30`}
        complexity={6}
        opacity={blobOpacity}
        size={400}
        speed={0.8}
        x="50%"
        y="46%"
      />

      <ParticleField
        count={80}
        opacity={particleOpacity}
        size={1.2}
        speed={0.2}
      />

      <GrainOverlay opacity={grainOpacity} />

      <div
        style={{
          position: "absolute",
          top: 60,
          right: 80,
          opacity: seedOpacity,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 13,
            fontWeight: 400,
            color: BRAND.fgMuted,
            letterSpacing: "0.1em",
          }}
        >
          Seed Round / 2026
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
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            filter: `blur(${logoBlur}px)`,
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            willChange: "filter, opacity, transform",
          }}
        >
          <Img
            src={staticFile("logo_dark.png")}
            style={{ width: 56, height: 56 }}
          />
        </div>

        <div style={{ marginTop: 32, overflow: "hidden" }}>
          {scrambleSettled ? (
            <TextReveal
              color={BRAND.fg}
              fontFamily={FONTS.serif}
              fontSize={140}
              mode="chars"
              staggerFrames={3}
              startFrame={40}
              style={{
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontWeight: 400,
              }}
              text="OpenBeam"
            />
          ) : (
            <ScrambleText
              color={BRAND.fg}
              durationFrames={15}
              fontFamily={FONTS.serif}
              fontSize={140}
              startFrame={35}
              style={{
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontWeight: 400,
              }}
              text="OpenBeam"
            />
          )}
        </div>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: lineWidth,
              height: 1,
              backgroundColor: BRAND.border,
            }}
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <TextReveal
            color={`${BRAND.fg}cc`}
            fontFamily={FONTS.sans}
            fontSize={24}
            mode="words"
            staggerFrames={4}
            startFrame={80}
            style={{
              letterSpacing: "0.04em",
              fontWeight: 400,
              justifyContent: "center",
            }}
            text="Intelligence for the physical world"
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: footerOpacity,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            fontWeight: 400,
            color: `${BRAND.fgMuted}99`,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Solo builder &middot; 25+ connectors &middot; 100+ AI tools
        </span>
      </div>

      <Vignette intensity={0.5} size={0.35} />
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <CameraMove
        durationFrames={240}
        intensity={0.6}
        startFrame={0}
        type="zoom"
      >
        {isGlitchActive ? (
          <Glitch
            durationFrames={4}
            intensity={0.6}
            slices={6}
            startFrame={glitchStart}
          >
            {titleContent}
          </Glitch>
        ) : (
          titleContent
        )}
      </CameraMove>
      <FilmBars animated ratio={2.35} startFrame={0} />
    </AbsoluteFill>
  );
};
