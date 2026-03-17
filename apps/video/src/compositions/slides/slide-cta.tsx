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
import { BlurReveal } from "../../components/blur-reveal";
import { GrainOverlay } from "../../components/grain-overlay";
import { ParticleField } from "../../components/particle-field";
import { PulseRing } from "../../components/pulse-ring";
import { TextReveal } from "../../components/text-reveal";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

export const SlideCta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeToBlack = interpolate(frame, [330, 360], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const grainOpacity = interpolate(frame, [0, 10], [0, 0.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headerFadeDown =
    frame >= 90
      ? interpolate(frame, [90, 105], [1, 0.3], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const lineWidth = interpolate(frame, [55, 75], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tryItScale = interpolate(
    spring({
      frame: frame - 100,
      fps,
      config: { damping: 14, stiffness: 40, mass: 1.5 },
    }),
    [0, 1],
    [0.7, 1]
  );
  const tryItOpacity = interpolate(
    spring({
      frame: frame - 100,
      fps,
      config: { damping: 20, stiffness: 80, mass: 1 },
    }),
    [0, 0.3],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  const tryItBlur = interpolate(
    spring({
      frame: frame - 100,
      fps,
      config: { damping: 20, stiffness: 80, mass: 1 },
    }),
    [0, 1],
    [40, 0]
  );

  const atOpacity = interpolate(frame, [120, 126], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const urlText = "app.openbeam.work/explore";
  const urlTypingStart = 125;
  const urlCharsPerFrame = 0.3;
  const urlCharsVisible = Math.min(
    urlText.length,
    Math.max(0, Math.floor((frame - urlTypingStart) * urlCharsPerFrame))
  );
  const urlTypingDone = urlCharsVisible >= urlText.length;
  const cursorBlink = Math.floor(frame / 12) % 2 === 0;

  const infraOpacity = interpolate(frame, [220, 230], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const imagineOpacity = interpolate(frame, [230, 240], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity: fadeIn * fadeToBlack }}>
        <GrainOverlay opacity={grainOpacity} />
        <ParticleField
          color={BRAND.fgMuted}
          count={30}
          opacity={0.15}
          speed={0.3}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            gap: 0,
          }}
        >
          {/* Header group — fades to 30% at frame 90 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              opacity: headerFadeDown,
            }}
          >
            {/* Logo */}
            {frame >= 25 && (
              <BlurReveal maxBlur={14} startFrame={25}>
                <Img
                  src={staticFile("logo_dark.png")}
                  style={{ width: 48, height: 48 }}
                />
              </BlurReveal>
            )}

            {/* "OpenBeam" */}
            {frame >= 35 && (
              <div style={{ marginTop: 16 }}>
                <TextReveal
                  color={BRAND.fg}
                  fontFamily={FONTS.serif}
                  fontSize={64}
                  mode="chars"
                  staggerFrames={2}
                  startFrame={35}
                  style={{ letterSpacing: "-0.02em" }}
                  text="OpenBeam"
                />
              </div>
            )}

            {/* Horizontal line */}
            {frame >= 55 && (
              <div
                style={{
                  marginTop: 20,
                  width: lineWidth,
                  height: 1,
                  background: BRAND.border,
                }}
              />
            )}

            {/* Tagline */}
            {frame >= 65 && (
              <div style={{ marginTop: 16 }}>
                <TextReveal
                  color={BRAND.fgMuted}
                  fontFamily={FONTS.sans}
                  fontSize={20}
                  mode="words"
                  staggerFrames={3}
                  startFrame={65}
                  text="Intelligence for the physical world"
                />
              </div>
            )}
          </div>

          {/* "Try it now" — MASSIVE */}
          {frame >= 100 && (
            <div
              style={{
                marginTop: 40,
                transform: `scale(${tryItScale})`,
                opacity: tryItOpacity,
                filter: `blur(${tryItBlur}px)`,
                willChange: "filter, opacity, transform",
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 120,
                  color: BRAND.fg,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                Try it now
              </span>
            </div>
          )}

          {/* PulseRing on "Try it now" landing */}
          {frame >= 100 && frame < 140 && (
            <PulseRing
              color={BRAND.blue}
              count={2}
              size={300}
              staggerFrames={10}
              startFrame={105}
              x={960}
              y={500}
            />
          )}

          {/* "at" */}
          {frame >= 120 && (
            <div style={{ marginTop: 16, opacity: atOpacity }}>
              <span
                style={{
                  fontFamily: FONTS.serif,
                  fontSize: 28,
                  color: BRAND.fgMuted,
                }}
              >
                at
              </span>
            </div>
          )}

          {/* URL — types in slowly */}
          {frame >= 125 && (
            <div
              style={{
                marginTop: 16,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 36,
                  color: BRAND.blue,
                  letterSpacing: "0.02em",
                }}
              >
                {urlCharsVisible > 0 ? urlText.slice(0, urlCharsVisible) : ""}
                {!urlTypingDone && urlCharsVisible > 0 && (
                  <span
                    style={{
                      opacity: cursorBlink ? 1 : 0.2,
                      color: BRAND.blue,
                    }}
                  >
                    |
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Infrastructure honesty */}
          {frame >= 220 && (
            <div
              style={{
                marginTop: 48,
                maxWidth: 700,
                textAlign: "center",
                opacity: infraOpacity,
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 14,
                  color: BRAND.fgMuted,
                  lineHeight: 1.7,
                  letterSpacing: "0.02em",
                }}
              >
                Running on 3 CPU nodes · No GPU · $500/mo on AKS
              </span>
            </div>
          )}

          {/* "Imagine what happens when we scale." */}
          {frame >= 230 && (
            <div style={{ marginTop: 8, opacity: imagineOpacity }}>
              <span
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 18,
                  color: BRAND.fg,
                  lineHeight: 1.7,
                }}
              >
                Imagine what happens when we scale.
              </span>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
