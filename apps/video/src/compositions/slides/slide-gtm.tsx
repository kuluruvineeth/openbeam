import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BlurReveal,
  CameraMove,
  Counter,
  GradientBg,
  GrainOverlay,
  HighlightText,
  LineDraw,
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
import { SlideLayout } from "./slide-layout";

interface BigStatProps {
  value: string;
  label: string;
  detail: string;
  borderColor: string;
  startFrame: number;
  burstX: number;
  burstY: number;
}

const BigStat: React.FC<BigStatProps> = ({
  value,
  label,
  detail,
  borderColor,
  startFrame,
  burstX: _burstX,
  burstY: _burstY,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });

  const y = interpolate(progress, [0, 1], [30, 0]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const borderDraw = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scrambleDone = frame >= startFrame + 20;

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        paddingLeft: 24,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 3,
          height: `${borderDraw * 100}%`,
          backgroundColor: borderColor,
          borderRadius: 2,
        }}
      />
      {scrambleDone ? (
        <Counter
          color={BRAND.fg}
          durationFrames={30}
          fontFamily={FONTS.mono}
          fontSize={56}
          startFrame={startFrame + 20}
          style={{ fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}
          value={value}
        />
      ) : (
        <ScrambleText
          charset="0123456789+$"
          color={BRAND.fg}
          durationFrames={20}
          fontFamily={FONTS.mono}
          fontSize={56}
          startFrame={startFrame}
          style={{ fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}
          text={value}
        />
      )}
      <Stagger
        distance={14}
        from="bottom"
        staggerFrames={6}
        startFrame={startFrame + 10}
      >
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 14,
            fontWeight: 400,
            color: BRAND.fg,
            lineHeight: 1.4,
            marginTop: 10,
          }}
        >
          {label}
        </div>
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 12,
            fontWeight: 400,
            color: BRAND.fgMuted,
            marginTop: 6,
            display: "block",
          }}
        >
          {detail}
        </span>
      </Stagger>
    </div>
  );
};

const TIMELINE_MILESTONES = [
  {
    time: "Now",
    milestone: "Open source launch",
    detail:
      "GitHub + Hacker News + developer community. MIT licensed. Deploy in 30 minutes.",
    dotX: 80,
  },
  {
    time: "Month 6",
    milestone: "Design partners — first revenue",
    detail: "3-5 manufacturing/logistics pilots. Pro upsell at $15/seat.",
    dotX: 450,
  },
  {
    time: "Month 12",
    milestone: "Enterprise expand — custom pricing",
    detail:
      "First air-gapped deployment. Usage-based physical ops pricing. Target: $50K+ ACV.",
    dotX: 820,
  },
];

const STAT_POSITIONS = [
  { x: 380, y: 470 },
  { x: 780, y: 470 },
  { x: 1180, y: 470 },
];

export const SlideGtm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const onePersonOpacity = interpolate(frame, [25, 33], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const twelveMonthsOpacity = interpolate(frame, [42, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subProgress = spring({
    frame: frame - 72,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });

  const subOpacity = interpolate(subProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const timelineStart = 140;
  const lineDrawPath = `M ${TIMELINE_MILESTONES[0].dotX} 20 L ${TIMELINE_MILESTONES[1].dotX} 20 L ${TIMELINE_MILESTONES[2].dotX} 20`;

  return (
    <SlideLayout label="Traction & Go-to-Market">
      <GradientBg colors={[BRAND.yellow, BRAND.orange]} opacity={0.06} />
      <GrainOverlay opacity={0.03} />
      <ParticleField count={70} opacity={0.08} speed={0.2} />

      <CameraMove
        durationFrames={200}
        intensity={0.3}
        startFrame={25}
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
              TRACTION & GO-TO-MARKET
            </span>
          </BlurReveal>

          <div style={{ marginTop: 16, maxWidth: 1000 }}>
            <div style={{ opacity: onePersonOpacity }}>
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={72}
                mode="words"
                staggerFrames={4}
                startFrame={25}
                style={{ lineHeight: 1.1 }}
                text="One person."
              />
            </div>
          </div>

          <div style={{ marginTop: 6, opacity: twelveMonthsOpacity }}>
            <TextReveal
              color={BRAND.fg}
              fontFamily={FONTS.serif}
              fontSize={72}
              mode="words"
              staggerFrames={4}
              startFrame={42}
              style={{ lineHeight: 1.1 }}
              text="Twelve months."
            />
          </div>

          <div style={{ marginTop: 6 }}>
            <HighlightText
              color={BRAND.fg}
              fontFamily={FONTS.serif}
              fontSize={72}
              highlightColor={BRAND.green}
              highlightStyle="underline"
              startFrame={60}
              style={{ lineHeight: 1.1 }}
              text="Production-ready."
            />
          </div>

          <div style={{ opacity: subOpacity, marginTop: 16, maxWidth: 820 }}>
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
              Every connector, every agent tool, every line of edge runtime —
              built by a single engineer. The same open source to enterprise
              path as GitLab ($15B), Elastic ($10B), and HashiCorp ($5B) — into
              a market none of them entered.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 48,
              marginTop: 44,
              position: "relative",
            }}
          >
            <BigStat
              borderColor={BRAND.blue}
              burstX={STAT_POSITIONS[0].x}
              burstY={STAT_POSITIONS[0].y}
              detail="SaaS, IoT, industrial protocols, physical AI"
              label="Connectors shipping"
              startFrame={85}
              value="25+"
            />
            <BigStat
              borderColor={BRAND.pink}
              burstX={STAT_POSITIONS[1].x}
              burstY={STAT_POSITIONS[1].y}
              detail="Search, RAG, orchestration, memory, canvas"
              label="AI tools & agents"
              startFrame={100}
              value="100+"
            />
            <BigStat
              borderColor={BRAND.orange}
              burstX={STAT_POSITIONS[2].x}
              burstY={STAT_POSITIONS[2].y}
              detail="Cloud, on-prem, fully air-gapped"
              label="Deployment targets"
              startFrame={115}
              value="3"
            />
          </div>

          <div
            style={{
              marginTop: 44,
              border: `1px solid ${BRAND.border}`,
              borderRadius: BRAND.radius,
              background: BRAND.card,
              padding: "20px 24px",
              position: "relative",
            }}
          >
            <div style={{ position: "relative", height: 50, marginBottom: 16 }}>
              <LineDraw
                d={lineDrawPath}
                durationFrames={40}
                height={50}
                startFrame={timelineStart}
                stroke={`${BRAND.fg}33`}
                strokeWidth={2}
                viewBox="0 0 900 50"
                width={900}
              />

              {TIMELINE_MILESTONES.map((ms, i) => {
                const dotStart = timelineStart + i * 14;
                const dotOpacity = interpolate(
                  frame,
                  [dotStart, dotStart + 8],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );
                const dotScale = spring({
                  frame: frame - dotStart,
                  fps,
                  config: { damping: 18, stiffness: 200, mass: 0.6 },
                });

                const colors = [
                  `${BRAND.fg}99`,
                  `${BRAND.fg}66`,
                  `${BRAND.fgMuted}80`,
                ];

                return (
                  <div
                    key={ms.time}
                    style={{ position: "absolute", left: ms.dotX - 6, top: 14 }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: colors[i],
                        opacity: dotOpacity,
                        transform: `scale(${dotScale})`,
                      }}
                    />
                    {dotOpacity > 0.5 && (
                      <PulseRing
                        color={colors[i]}
                        count={2}
                        size={40}
                        staggerFrames={6}
                        startFrame={dotStart + 4}
                        x={6}
                        y={6}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <Stagger
              distance={30}
              from="left"
              staggerFrames={14}
              startFrame={timelineStart + 5}
            >
              {TIMELINE_MILESTONES.map((ms, i) => {
                const rowStart = timelineStart + 5 + i * 14;
                const rowProgress = spring({
                  frame: frame - rowStart,
                  fps,
                  config: { damping: 26, stiffness: 100, mass: 0.8 },
                });

                const rowX = interpolate(rowProgress, [0, 1], [30, 0]);
                const rowOpacity = interpolate(rowProgress, [0, 0.5], [0, 1], {
                  extrapolateRight: "clamp",
                });

                return (
                  <div
                    key={ms.time}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 24,
                      paddingTop: 10,
                      paddingBottom: 10,
                      borderBottom:
                        i < TIMELINE_MILESTONES.length - 1
                          ? `1px solid ${BRAND.border}60`
                          : "none",
                      opacity: rowOpacity,
                      transform: `translateX(${rowX}px)`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 14,
                        fontWeight: 500,
                        color: BRAND.fg,
                        letterSpacing: "0.08em",
                        minWidth: 90,
                        flexShrink: 0,
                      }}
                    >
                      {ms.time}
                    </span>
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 14,
                        fontWeight: 400,
                        color: BRAND.fg,
                        minWidth: 240,
                        flexShrink: 0,
                      }}
                    >
                      {ms.milestone}
                    </span>
                    <span
                      style={{
                        fontFamily: FONTS.sans,
                        fontSize: 12,
                        fontWeight: 400,
                        color: `${BRAND.fg}b3`,
                      }}
                    >
                      {ms.detail}
                    </span>
                  </div>
                );
              })}
            </Stagger>
          </div>
        </div>
      </CameraMove>

      <ZoomBurst
        color={BRAND.blue}
        durationFrames={20}
        lineCount={16}
        maxLength={120}
        opacity={0.3}
        startFrame={85 + 50}
        x={STAT_POSITIONS[0].x}
        y={STAT_POSITIONS[0].y}
      />
      <ZoomBurst
        color={BRAND.pink}
        durationFrames={20}
        lineCount={16}
        maxLength={120}
        opacity={0.3}
        startFrame={100 + 50}
        x={STAT_POSITIONS[1].x}
        y={STAT_POSITIONS[1].y}
      />
      <ZoomBurst
        color={BRAND.orange}
        durationFrames={20}
        lineCount={16}
        maxLength={120}
        opacity={0.3}
        startFrame={115 + 50}
        x={STAT_POSITIONS[2].x}
        y={STAT_POSITIONS[2].y}
      />

      <Vignette intensity={0.3} size={0.35} />
    </SlideLayout>
  );
};
