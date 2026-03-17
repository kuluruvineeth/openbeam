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
  FilmBars,
  GradientBg,
  GrainOverlay,
  ParticleField,
  ScrambleText,
  TextReveal,
  Vignette,
  ZoomBurst,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

const DIGITAL_TAGS = [
  { label: "Slack", opacity: "cc" },
  { label: "Jira", opacity: "cc" },
  { label: "GitHub", opacity: "cc" },
  { label: "Notion", opacity: "cc" },
  { label: "Gmail", opacity: "cc" },
  { label: "Confluence", opacity: "66" },
  { label: "Linear", opacity: "66" },
  { label: "Salesforce", opacity: "66" },
  { label: "Google Drive", opacity: "66" },
];

const PHYSICAL_TAGS = [
  { label: "MQTT", opacity: "cc" },
  { label: "OPC-UA", opacity: "cc" },
  { label: "BACnet", opacity: "cc" },
  { label: "Samsara", opacity: "cc" },
  { label: "Verkada", opacity: "cc" },
  { label: "SmartThings", opacity: "80" },
  { label: "AWS IoT", opacity: "80" },
  { label: "ThingsBoard", opacity: "80" },
];

interface ConnectorCardProps {
  title: string;
  count: string;
  tags: Array<{ label: string; opacity: string }>;
  accentColor: string;
  tagBgColor: string;
  slideFrom: "left" | "right";
  startFrame: number;
  tagBaseFrame: number;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({
  title,
  count,
  tags,
  accentColor,
  tagBgColor,
  slideFrom,
  startFrame,
  tagBaseFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardProgress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 22, stiffness: 80, mass: 1 },
  });

  const slideDistance = slideFrom === "left" ? -120 : 120;
  const cardX = interpolate(cardProgress, [0, 1], [slideDistance, 0]);
  const cardOpacity = interpolate(cardProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        backgroundColor: BRAND.card,
        border: `1px solid ${BRAND.border}`,
        borderTop: `2px solid ${accentColor}`,
        borderRadius: BRAND.radius,
        padding: "24px 24px",
        transform: `translateX(${cardX}px)`,
        opacity: cardOpacity,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        willChange: "transform, opacity",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            fontWeight: 600,
            color: BRAND.fgMuted,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            fontWeight: 400,
            color: `${BRAND.fgMuted}99`,
            letterSpacing: "0.1em",
          }}
        >
          {count}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tags.map((tag, i) => {
          const tagProgress = spring({
            frame: frame - tagBaseFrame - i * 3,
            fps,
            config: { damping: 22, stiffness: 120, mass: 0.6 },
          });
          const tagOpacity = interpolate(tagProgress, [0, 0.6], [0, 1], {
            extrapolateRight: "clamp",
          });
          const tagY = interpolate(tagProgress, [0, 1], [8, 0]);

          const glitchSettled = frame >= tagBaseFrame + i * 3 + 8;
          const glitchActive = frame >= tagBaseFrame + i * 3 && !glitchSettled;
          const glitchOffsetX = glitchActive
            ? Math.sin((frame + i * 37) * 7.3) * 3
            : 0;

          return (
            <span
              key={tag.label}
              style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                fontWeight: 500,
                color: `${BRAND.fg}${tag.opacity}`,
                backgroundColor: tagBgColor,
                borderRadius: 2,
                padding: "6px 12px",
                opacity: tagOpacity,
                transform: `translateY(${tagY}px) translateX(${glitchOffsetX}px)`,
              }}
            >
              {tag.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const SlideSolution: React.FC = () => {
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

  const platformRevealFrame = 140;

  const platformProgress = spring({
    frame: frame - platformRevealFrame,
    fps,
    config: { damping: 16, stiffness: 120, mass: 0.7 },
  });
  const platformScale = interpolate(
    platformProgress,
    [0, 0.5, 1],
    [0.3, 1.05, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const platformOpacity = interpolate(platformProgress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });
  const platformBlur = interpolate(platformProgress, [0, 0.5], [20, 0], {
    extrapolateRight: "clamp",
  });

  const filmBarProgress = spring({
    frame: frame - platformRevealFrame,
    fps,
    config: { damping: 22, stiffness: 80, mass: 1 },
  });
  const filmBarRatio = interpolate(filmBarProgress, [0, 1], [2.35, 16 / 9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showFilmBars = frame < platformRevealFrame;

  const cardsContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginTop: 28,
      }}
    >
      <div style={{ display: "flex", gap: 20 }}>
        <ConnectorCard
          accentColor={`${BRAND.fg}4d`}
          count="9 connectors"
          slideFrom="left"
          startFrame={80}
          tagBaseFrame={100}
          tagBgColor={`${BRAND.fg}14`}
          tags={DIGITAL_TAGS}
          title="Digital Knowledge"
        />
        <ConnectorCard
          accentColor={`${BRAND.fgMuted}66`}
          count="8 connectors"
          slideFrom="right"
          startFrame={80}
          tagBaseFrame={110}
          tagBgColor={`${BRAND.fgMuted}14`}
          tags={PHYSICAL_TAGS}
          title="Physical Operations"
        />
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AbsoluteFill style={{ opacity: masterFadeIn * masterFadeOut }}>
        <GradientBg
          colors={[BRAND.blue, BRAND.orange]}
          opacity={0.05}
          speed={0.7}
        />

        <ParticleField count={50} opacity={0.1} size={1} speed={0.2} />

        <GrainOverlay opacity={0.035} />

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
              The Solution
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
            padding: "100px 80px 50px",
          }}
        >
          <div>
            <TextReveal
              color={BRAND.fg}
              fontFamily={FONTS.serif}
              fontSize={60}
              mode="words"
              staggerFrames={3}
              startFrame={30}
              style={{
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                fontWeight: 400,
                whiteSpace: "nowrap",
              }}
              text="One query across sensors and SaaS."
            />
          </div>

          <div style={{ maxWidth: 900, marginTop: 8 }}>
            <TextReveal
              color={`${BRAND.fg}cc`}
              fontFamily={FONTS.serif}
              fontSize={64}
              mode="chars"
              staggerFrames={2}
              startFrame={50}
              style={{
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
              text="Answers in 200ms."
            />
          </div>

          <div style={{ opacity: subtextOpacity, marginTop: 18 }}>
            <p
              style={{
                fontFamily: FONTS.sans,
                fontSize: 16,
                fontWeight: 400,
                color: BRAND.fgMuted,
                lineHeight: 1.55,
                margin: 0,
                maxWidth: 860,
              }}
            >
              A factory engineer asks why Line 3 tripped last night. OpenBeam
              synthesizes the OPC-UA sensor spike, the Slack thread from night
              shift, and the equipment manual from Confluence — one answer,
              three data planes, 200ms.
            </p>
          </div>

          {cardsContent}

          <ZoomBurst
            color={`${BRAND.fg}20`}
            durationFrames={18}
            lineCount={20}
            maxLength={300}
            opacity={0.4}
            startFrame={platformRevealFrame}
            x={960}
            y={820}
          />

          <div
            style={{
              marginTop: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              opacity: platformOpacity,
              transform: `scale(${platformScale})`,
              filter: `blur(${platformBlur}px)`,
              backgroundColor: `${BRAND.fg}0f`,
              padding: "24px 32px",
              borderRadius: BRAND.radius,
              willChange: "filter, opacity, transform",
            }}
          >
            <ScrambleText
              color={BRAND.fgMuted}
              durationFrames={18}
              fontFamily={FONTS.mono}
              fontSize={13}
              startFrame={platformRevealFrame + 2}
              style={{
                fontWeight: 600,
                letterSpacing: "0.15em",
              }}
              text="ONE UNIFIED PLATFORM"
            />
            <span
              style={{
                fontFamily: FONTS.serif,
                fontSize: 24,
                fontWeight: 400,
                color: BRAND.fg,
                textAlign: "center",
                opacity: interpolate(
                  spring({
                    frame: frame - (platformRevealFrame + 10),
                    fps,
                    config: { damping: 26, stiffness: 100, mass: 0.8 },
                  }),
                  [0, 0.5],
                  [0, 1],
                  { extrapolateRight: "clamp" }
                ),
              }}
            >
              Search across sensors and SaaS. AI agents that act. Cloud,
              on-prem, or air-gapped.
            </span>
          </div>
        </div>

        <Vignette intensity={0.35} size={0.3} />
      </AbsoluteFill>

      {showFilmBars && <FilmBars ratio={2.35} />}
      {!showFilmBars && <FilmBars ratio={filmBarRatio} />}
    </AbsoluteFill>
  );
};
