import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BlurReveal,
  CameraMove,
  Counter,
  GradientBg,
  GrainOverlay,
  ScrambleText,
  Stagger,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";
import { SlideLayout } from "./slide-layout";

const HAS_DIGIT_REGEX = /\d/;

interface TierCardProps {
  name: string;
  price: string;
  priceSuffix?: string;
  description: string;
  highlighted?: boolean;
  startFrame: number;
  index: number;
}

const TierCard: React.FC<TierCardProps> = ({
  name,
  price,
  priceSuffix,
  description,
  highlighted = false,
  startFrame,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dealIn = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });

  const x = interpolate(dealIn, [0, 1], [300, 0]);
  const rotation = interpolate(dealIn, [0, 0.6, 1], [8 - index * 3, -1, 0]);
  const opacity = interpolate(dealIn, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const glowOpacity = highlighted
    ? interpolate(
        frame,
        [startFrame + 15, startFrame + 30, startFrame + 50],
        [0, 0.6, 0.25],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  const pulseGlow =
    highlighted && frame >= startFrame + 15
      ? 0.15 + 0.1 * Math.sin((frame - startFrame) * 0.15)
      : 0;

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        transform: `translateX(${x}px) rotate(${rotation}deg)`,
        opacity,
      }}
    >
      {highlighted && (
        <div
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: BRAND.radius + 2,
            boxShadow: `0 0 24px 6px ${BRAND.fg}${Math.round(
              (glowOpacity + pulseGlow) * 255
            )
              .toString(16)
              .padStart(2, "0")}`,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          background: BRAND.card,
          borderRadius: BRAND.radius,
          padding: 24,
          border: `1px solid ${BRAND.border}`,
          borderTop: highlighted
            ? `2px solid ${BRAND.fg}66`
            : `1px solid ${BRAND.border}`,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            fontWeight: 500,
            color: BRAND.fgMuted,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {name}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            margin: "16px 0 12px",
            lineHeight: 1,
          }}
        >
          {HAS_DIGIT_REGEX.test(price) ? (
            <Counter
              color={BRAND.fg}
              durationFrames={30}
              fontFamily={FONTS.mono}
              fontSize={36}
              startFrame={startFrame + 5}
              style={{ fontWeight: 600 }}
              value={price}
            />
          ) : (
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 36,
                fontWeight: 600,
                color: BRAND.fg,
                opacity: interpolate(
                  spring({
                    frame: frame - startFrame - 5,
                    fps,
                    config: { damping: 26, stiffness: 100, mass: 0.8 },
                  }),
                  [0, 0.5],
                  [0, 1],
                  { extrapolateRight: "clamp" }
                ),
              }}
            >
              {price}
            </span>
          )}
          {priceSuffix && (
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 14,
                color: `${BRAND.fg}b3`,
              }}
            >
              {priceSuffix}
            </span>
          )}
        </div>
        <p
          style={{
            fontFamily: FONTS.sans,
            fontSize: 12,
            fontWeight: 400,
            color: `${BRAND.fg}b3`,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

const SEGMENTS = [
  {
    label: "Platform",
    mix: "45%",
    percentage: 45,
    margin: "85-90%",
    bg: `${BRAND.fg}1f`,
  },
  {
    label: "Usage",
    mix: "30%",
    percentage: 30,
    margin: "80%+",
    bg: `${BRAND.fg}17`,
  },
  {
    label: "Cloud",
    mix: "20%",
    percentage: 20,
    margin: "75-80%",
    bg: `${BRAND.fg}0f`,
  },
  {
    label: "Services",
    mix: "5%",
    percentage: 5,
    margin: "60-70%",
    bg: `${BRAND.fg}0a`,
  },
];

export const SlideBusiness: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const subProgress = spring({
    frame: frame - 50,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });

  const subOpacity = interpolate(subProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const barStartFrame = 110;
  const gridStartFrame = 145;

  return (
    <SlideLayout label="Business Model">
      <GradientBg colors={[BRAND.green, BRAND.blue]} opacity={0.06} />
      <GrainOverlay opacity={0.03} />

      <CameraMove
        durationFrames={160}
        intensity={0.35}
        startFrame={60}
        type="zoom"
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "120px 80px 60px",
          }}
        >
          <BlurReveal startFrame={20}>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                fontWeight: 500,
                color: BRAND.fgMuted,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              BUSINESS MODEL
            </span>
          </BlurReveal>

          <div style={{ marginTop: 16 }}>
            <TextReveal
              color={BRAND.fg}
              fontFamily={FONTS.serif}
              fontSize={64}
              mode="words"
              staggerFrames={3}
              startFrame={25}
              style={{ lineHeight: 1.1 }}
              text="Open source to land."
            />
          </div>
          <TextReveal
            color={BRAND.fg}
            fontFamily={FONTS.serif}
            fontSize={64}
            mode="words"
            staggerFrames={3}
            startFrame={40}
            style={{ lineHeight: 1.1 }}
            text="Usage-based to expand."
          />

          <div style={{ opacity: subOpacity, marginTop: 12 }}>
            <p
              style={{
                fontFamily: FONTS.serif,
                fontSize: 42,
                fontWeight: 400,
                color: `${BRAND.fg}b3`,
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              Seat-based for digital. Usage-based for physical.
            </p>
          </div>

          <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
            <TierCard
              description="Self-hosted, MIT licensed, full features, 3 users"
              index={0}
              name="OPEN SOURCE"
              price="$0"
              startFrame={65}
            />
            <TierCard
              description="Unlimited users, managed cloud, SSO, support"
              highlighted
              index={1}
              name="PRO"
              price="$15"
              priceSuffix="/seat/mo"
              startFrame={75}
            />
            <TierCard
              description="Air-gapped, RBAC, audit logs, per-device pricing for physical ops"
              index={2}
              name="ENTERPRISE"
              price="Custom"
              startFrame={85}
            />
          </div>

          <div style={{ marginTop: 36 }}>
            <div
              style={{
                display: "flex",
                height: 28,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {SEGMENTS.map((seg, i) => {
                const segStart = barStartFrame + i * 12;
                const segProgress = interpolate(
                  frame,
                  [segStart, segStart + 20],
                  [0, seg.percentage],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );

                const counterVisible = segProgress > seg.percentage * 0.5;

                return (
                  <div
                    key={seg.label}
                    style={{
                      width: `${segProgress}%`,
                      backgroundColor: seg.bg,
                      borderRight:
                        i < SEGMENTS.length - 1
                          ? `1px solid ${BRAND.bg}`
                          : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {counterVisible && segProgress >= 15 && (
                      <span
                        style={{
                          fontFamily: FONTS.mono,
                          fontSize: 10,
                          color: `${BRAND.fg}80`,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {seg.mix}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <Stagger
              distance={20}
              from="bottom"
              staggerFrames={8}
              startFrame={gridStartFrame}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                marginTop: 12,
              }}
            >
              {SEGMENTS.map((seg, i) => (
                <div
                  key={seg.label}
                  style={{
                    background: BRAND.card,
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: BRAND.radius,
                    padding: "12px 14px",
                  }}
                >
                  <ScrambleText
                    charset="0123456789%+-"
                    color={BRAND.fg}
                    durationFrames={20}
                    fontFamily={FONTS.mono}
                    fontSize={14}
                    startFrame={gridStartFrame + i * 8}
                    style={{ fontWeight: 600, lineHeight: 1 }}
                    text={seg.margin}
                  />
                  <div
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 10,
                      color: `${BRAND.fg}b3`,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginTop: 6,
                    }}
                  >
                    {seg.label} {seg.mix}
                  </div>
                </div>
              ))}
            </Stagger>
          </div>
        </div>
      </CameraMove>

      <Vignette intensity={0.3} size={0.35} />
    </SlideLayout>
  );
};
