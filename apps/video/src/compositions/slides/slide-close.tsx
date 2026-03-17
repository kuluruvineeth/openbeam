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
  ChromaticAberration,
  FilmBars,
  GradientBg,
  GrainOverlay,
  ParticleField,
  PulseRing,
  Stagger,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

const ScrambleText: React.FC<{
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
  const chars = "0123456789$.,KMB%ABCDEF";

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

  const scrambled = text
    .split("")
    .map((ch) => {
      if (ch === " ") {
        return " ";
      }
      return chars[Math.floor(Math.random() * chars.length)];
    })
    .join("");

  return (
    <span style={{ fontSize, fontFamily, color, ...style }}>{scrambled}</span>
  );
};

const ALLOCATIONS = [
  {
    label: "Engineering",
    pct: 60,
    opacity: "80",
    detail: "3 engineers \u2192 75 connectors, production edge runtime",
  },
  {
    label: "Go-to-Market",
    pct: 25,
    opacity: "66",
    detail: "DevRel + 1 AE \u2192 10 enterprise design partners",
  },
  {
    label: "Infrastructure",
    pct: 10,
    opacity: "4d",
    detail: "Edge test lab, SOC 2 certification",
  },
  {
    label: "Operations",
    pct: 5,
    opacity: "33",
    detail: "Legal, ops",
  },
];

export const SlideClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [215, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = fadeIn * fadeOut;

  const gradientOpacity = interpolate(frame, [0, 10, 15], [0, 0, 0.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const particleSpeed = interpolate(
    frame,
    [40, 45, 55, 65],
    [0.15, 0.6, 0.6, 0.15],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const heroProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 40, mass: 1.5 },
  });
  const heroScale = interpolate(heroProgress, [0, 1], [0.3, 1]);
  const heroBlur = interpolate(heroProgress, [0, 1], [50, 0]);
  const heroOpacity = interpolate(heroProgress, [0, 0.25], [0, 1], {
    extrapolateRight: "clamp",
  });

  const showChromatic = frame >= 38 && frame <= 41 && heroScale > 0.75;

  const heroLanded = heroProgress > 0.95;

  const seedProgress = spring({
    frame: frame - 55,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const seedY = interpolate(seedProgress, [0, 1], [30, 0]);
  const seedOpacity = interpolate(seedProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const vignetteIntensity = interpolate(
    frame,
    [30, 45, 50, 60],
    [0.35, 0.5, 0.5, 0.35],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const finalProgress = spring({
    frame: frame - 160,
    fps,
    config: { damping: 12, stiffness: 45, mass: 1.5 },
  });
  const finalY = interpolate(finalProgress, [0, 1], [60, 0]);
  const finalScale = interpolate(finalProgress, [0, 1], [0.85, 1]);
  const finalBlur = interpolate(finalProgress, [0, 1], [40, 0]);
  const finalOpacity = interpolate(finalProgress, [0, 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });

  const filmBarRatio = interpolate(
    frame,
    [0, 15, 160, 185],
    [2.35, 2.35, 2.35, 1.778],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const urlProgress = spring({
    frame: frame - 195,
    fps,
    config: { damping: 30, stiffness: 100, mass: 0.8 },
  });
  const urlOpacity = interpolate(urlProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const askLabelOpacity = interpolate(frame, [20, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity }}>
        <ParticleField
          count={150}
          opacity={0.1}
          size={1.5}
          speed={particleSpeed}
        />
        <GradientBg
          colors={[BRAND.pink, BRAND.blue]}
          opacity={gradientOpacity}
          speed={0.8}
        />
        <GrainOverlay opacity={0.06} />

        {heroLanded && (
          <>
            <PulseRing
              color={BRAND.pink}
              count={2}
              size={280}
              staggerFrames={15}
              startFrame={Math.round(30 + 45)}
              x={960}
              y={300}
            />
            <PulseRing
              color={BRAND.blue}
              count={2}
              size={400}
              staggerFrames={20}
              startFrame={Math.round(30 + 50)}
              x={960}
              y={300}
            />
          </>
        )}

        {frame >= 175 && (
          <PulseRing
            color={BRAND.blue}
            count={3}
            size={350}
            staggerFrames={8}
            startFrame={175}
            x={960}
            y={620}
          />
        )}

        <div
          style={{
            position: "absolute",
            top: 60,
            left: 80,
            opacity: askLabelOpacity,
          }}
        >
          <ScrambleText
            color={`${BRAND.fg}e6`}
            fontFamily={FONTS.mono}
            fontSize={13}
            settleFrame={35}
            startFrame={20}
            style={{
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
            }}
            text="THE ASK"
          />
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
            padding: "80px 80px 60px",
          }}
        >
          <div
            style={{
              transform: `scale(${heroScale})`,
              filter: `blur(${heroBlur}px)`,
              opacity: heroOpacity,
              willChange: "filter, opacity, transform",
            }}
          >
            {showChromatic ? (
              <ChromaticAberration
                durationFrames={3}
                offset={6}
                startFrame={38}
              >
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 140,
                    fontWeight: 600,
                    color: BRAND.fg,
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                  }}
                >
                  <ScrambleText
                    color={BRAND.fg}
                    fontFamily={FONTS.mono}
                    fontSize={140}
                    settleFrame={50}
                    startFrame={30}
                    style={{ fontWeight: 600, letterSpacing: "-0.03em" }}
                    text="$4M"
                  />
                </span>
              </ChromaticAberration>
            ) : (
              <ScrambleText
                color={BRAND.fg}
                fontFamily={FONTS.mono}
                fontSize={140}
                settleFrame={50}
                startFrame={30}
                style={{
                  fontWeight: 600,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}
                text="$4M"
              />
            )}
          </div>

          <div
            style={{
              transform: `translateY(${seedY}px)`,
              opacity: seedOpacity,
              marginTop: 8,
            }}
          >
            <TextReveal
              color={BRAND.fg}
              fontFamily={FONTS.serif}
              fontSize={32}
              mode="words"
              staggerFrames={5}
              startFrame={55}
              style={{ justifyContent: "center" }}
              text="Seed Round"
            />
          </div>

          <div style={{ marginTop: 40, width: "100%", maxWidth: 700 }}>
            <div
              style={{
                display: "flex",
                height: 8,
                borderRadius: BRAND.radius,
                overflow: "hidden",
              }}
            >
              {ALLOCATIONS.map((seg, i) => {
                const segStart = 70 + i * 4;
                const segProgress = spring({
                  frame: frame - segStart,
                  fps,
                  config: {
                    damping: 25 - i * 3,
                    stiffness: 70 + i * 15,
                    mass: 1,
                  },
                });
                const width = interpolate(segProgress, [0, 1], [0, seg.pct]);

                return (
                  <div
                    key={seg.label}
                    style={{
                      width: `${width}%`,
                      backgroundColor: `${BRAND.fg}${seg.opacity}`,
                    }}
                  />
                );
              })}
            </div>

            <Stagger
              distance={20}
              from="bottom"
              staggerFrames={8}
              startFrame={85}
              style={{ display: "flex", marginTop: 12 }}
            >
              {ALLOCATIONS.map((seg) => (
                <div key={seg.label} style={{ flex: seg.pct }}>
                  <div
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: 12,
                      fontWeight: 400,
                      color: BRAND.fg,
                      lineHeight: 1.3,
                    }}
                  >
                    {seg.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 12,
                      fontWeight: 400,
                      color: `${BRAND.fg}${seg.opacity}`,
                      marginTop: 2,
                      lineHeight: 1.3,
                    }}
                  >
                    {seg.pct}%
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: 10,
                      fontWeight: 400,
                      color: `${BRAND.fgMuted}b3`,
                      marginTop: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    {seg.detail}
                  </div>
                </div>
              ))}
            </Stagger>
          </div>

          <div style={{ marginTop: 36, textAlign: "center", maxWidth: 750 }}>
            <TextReveal
              color={BRAND.fgMuted}
              fontFamily={FONTS.serif}
              fontSize={36}
              mode="words"
              staggerFrames={3}
              startFrame={110}
              style={{ justifyContent: "center", lineHeight: 1.3 }}
              text="Every enterprise will search across sensors and SaaS."
            />
            <div style={{ marginTop: 12 }}>
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={36}
                mode="words"
                staggerFrames={3}
                startFrame={135}
                style={{ justifyContent: "center", lineHeight: 1.3 }}
                text="The company that owns this layer becomes infrastructure."
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 32,
              transform: `scale(${finalScale}) translateY(${finalY}px)`,
              filter: `blur(${finalBlur}px)`,
              opacity: finalOpacity,
              willChange: "filter, opacity, transform",
            }}
          >
            <BlurReveal maxBlur={40} startFrame={160}>
              <h3
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 80,
                  fontWeight: 400,
                  color: BRAND.fg,
                  lineHeight: 1,
                  margin: 0,
                  letterSpacing: "-0.02em",
                  position: "relative",
                }}
              >
                We're building it.
                {frame >= 175 && (
                  <PulseRing
                    color={BRAND.fg}
                    count={1}
                    size={80}
                    staggerFrames={0}
                    startFrame={175}
                    x={0}
                    y={0}
                  />
                )}
              </h3>
            </BlurReveal>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: urlOpacity,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 18,
              fontWeight: 400,
              color: BRAND.fg,
            }}
          >
            openbeam.work
          </span>
        </div>

        <FilmBars ratio={filmBarRatio} />
        <Vignette intensity={vignetteIntensity} size={0.35} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
