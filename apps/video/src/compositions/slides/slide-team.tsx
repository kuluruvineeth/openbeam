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
  BlurReveal,
  CameraMove,
  FilmBars,
  GradientBg,
  GrainOverlay,
  Stagger,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

const HIRES = [
  "Distributed systems engineer — edge infrastructure",
  "Enterprise sales — manufacturing vertical",
  "Developer advocate — open source community",
];

export const SlideTeam: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = fadeIn * fadeOut;

  const avatarProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 18, stiffness: 60, mass: 1.2 },
  });
  const avatarScale = interpolate(avatarProgress, [0, 1], [1.05, 1]);
  const avatarBlur = interpolate(avatarProgress, [0, 1], [30, 0]);
  const avatarOpacity = interpolate(avatarProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const warmGlowOpacity = interpolate(avatarProgress, [0.3, 0.8], [0, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const roleProgress = spring({
    frame: frame - 85,
    fps,
    config: { damping: 30, stiffness: 100, mass: 0.8 },
  });
  const roleOpacity = interpolate(roleProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bioProgress = spring({
    frame: frame - 95,
    fps,
    config: { damping: 30, stiffness: 100, mass: 0.8 },
  });
  const bioOpacity = interpolate(bioProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity }}>
        <GradientBg colors={[BRAND.orange]} opacity={0.04} speed={0.3} />
        <GrainOverlay opacity={0.05} />

        <CameraMove
          durationFrames={240}
          intensity={-0.3}
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
                WHO
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
              alignItems: "center",
              justifyContent: "center",
              padding: "100px 80px 60px",
            }}
          >
            <div
              style={{
                position: "relative",
                transform: `scale(${avatarScale})`,
                opacity: avatarOpacity,
                filter: `blur(${avatarBlur}px)`,
                willChange: "filter, opacity, transform",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -20,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${BRAND.orange}40 0%, transparent 70%)`,
                  opacity: warmGlowOpacity,
                  filter: "blur(20px)",
                  pointerEvents: "none",
                }}
              />
              <Img
                src={staticFile("profile_photo.jpg")}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: BRAND.radius,
                  objectFit: "cover",
                  border: `1px solid ${BRAND.border}`,
                  position: "relative",
                }}
              />
            </div>

            <div style={{ marginTop: 28, textAlign: "center" }}>
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={48}
                mode="chars"
                staggerFrames={5}
                startFrame={50}
                style={{
                  justifyContent: "center",
                  letterSpacing: "-0.02em",
                  fontWeight: 400,
                }}
                text="Kuluru Vineeth Kumar Reddy"
              />
            </div>

            <div
              style={{
                opacity: roleOpacity,
                marginTop: 10,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 14,
                  fontWeight: 400,
                  color: BRAND.fgMuted,
                }}
              >
                Builder
              </span>
            </div>

            <div
              style={{
                opacity: bioOpacity,
                marginTop: 16,
                maxWidth: 400,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                  fontWeight: 400,
                  color: `${BRAND.fgMuted}b3`,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Obsessed with building things that matter.
              </p>
            </div>

            <div style={{ marginTop: 52, width: "100%", maxWidth: 500 }}>
              <BlurReveal maxBlur={10} startFrame={110}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 12,
                      fontWeight: 400,
                      color: `${BRAND.fgMuted}99`,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    FIRST THREE HIRES
                  </span>
                </div>
              </BlurReveal>

              <Stagger
                distance={30}
                from="bottom"
                staggerFrames={12}
                startFrame={120}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                {HIRES.map((hire) => (
                  <div key={hire} style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 13,
                        fontWeight: 400,
                        color: `${BRAND.fgMuted}cc`,
                        lineHeight: 1.6,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {hire}
                    </span>
                  </div>
                ))}
              </Stagger>
            </div>
          </div>
        </CameraMove>

        <FilmBars ratio={2.35} />
        <Vignette intensity={0.3} size={0.3} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
