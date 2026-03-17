import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraMove } from "../../components/camera-move";
import { GradientBg } from "../../components/gradient-bg";
import { GrainOverlay } from "../../components/grain-overlay";
import { LineDraw } from "../../components/line-draw";
import { ParticleField } from "../../components/particle-field";
import { PulseRing } from "../../components/pulse-ring";
import { ScanLine } from "../../components/scan-line";
import { TextReveal } from "../../components/text-reveal";
import { Vignette } from "../../components/vignette";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";
import { SlideLayout } from "./slide-layout";

const SCRAMBLE_CHARS = "0123456789:";

function seededDigit(seed: number): string {
  const idx =
    Math.abs(Math.floor(Math.sin(seed * 9301 + 49_297) * 49_297)) %
    SCRAMBLE_CHARS.length;
  return SCRAMBLE_CHARS[idx];
}

const ScrambleTime: React.FC<{
  text: string;
  startFrame: number;
  durationFrames?: number;
}> = ({ text, startFrame, durationFrames = 25 }) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;

  if (elapsed < 0) {
    return null;
  }

  const progress = Math.min(1, elapsed / durationFrames);
  const resolved = Math.floor(progress * text.length);

  const chars = text.split("").map((ch, i) => {
    if (ch === ":" || ch === " ") {
      return ch;
    }
    if (i < resolved) {
      return ch;
    }
    if (progress >= 1) {
      return ch;
    }
    return seededDigit(frame * 100 + i);
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        fontFamily: FONTS.mono,
        fontSize: 110,
        fontWeight: 600,
        color: BRAND.fg,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        opacity,
        display: "block",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {chars.join("")}
    </span>
  );
};

const TIMELINE_STEPS = [
  {
    label: "Vibration sensor spike detected",
    color: BRAND.blue,
    frame: 80,
  },
  {
    label: "Pattern matched: Mill 9 bearing failure Q3",
    color: BRAND.yellow,
    frame: 105,
  },
  {
    label: "P2 ticket filed, night shift lead alerted",
    color: BRAND.orange,
    frame: 130,
  },
  {
    label: "Parts order scheduled",
    color: BRAND.green,
    frame: 155,
  },
];

const STEP_SPACING = 64;
const DOT_SIZE = 12;
const DOT_X = 50;
const TIMELINE_TOP = 10;

const TimelineStep: React.FC<{
  step: (typeof TIMELINE_STEPS)[number];
  index: number;
  isLast: boolean;
}> = ({ step, index, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dotProgress = spring({
    frame: frame - step.frame,
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.4 },
  });
  const dotScale = interpolate(dotProgress, [0, 1], [0, 1]);
  const dotOpacity = interpolate(dotProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  const labelProgress = spring({
    frame: frame - step.frame - 4,
    fps,
    config: { damping: 26, stiffness: 120, mass: 0.7 },
  });
  const labelX = interpolate(labelProgress, [0, 1], [24, 0]);
  const labelOpacity = interpolate(labelProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const glitchActive = frame >= step.frame - 1 && frame < step.frame + 2;
  const glitchOffset = glitchActive ? Math.sin(frame * 47.3 + index) * 3 : 0;

  const dotY = TIMELINE_TOP + index * STEP_SPACING;
  const lineStartY = dotY + DOT_SIZE / 2 + 4;

  return (
    <div style={{ position: "relative", height: STEP_SPACING }}>
      <PulseRing
        color={step.color}
        count={3}
        size={100}
        staggerFrames={6}
        startFrame={step.frame}
        x={DOT_X}
        y={dotY + DOT_SIZE / 2}
      />

      <div
        style={{
          position: "absolute",
          left: DOT_X - DOT_SIZE / 2,
          top: dotY,
          width: DOT_SIZE,
          height: DOT_SIZE,
          backgroundColor: step.color,
          borderRadius: "50%",
          transform: `scale(${dotScale})`,
          opacity: dotOpacity,
          boxShadow: `0 0 20px 4px ${step.color}50, 0 0 40px 8px ${step.color}20`,
        }}
      />

      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: DOT_X - 0.5,
            top: lineStartY,
            width: 1,
            overflow: "hidden",
          }}
        >
          <LineDraw
            d={`M 0 0 L 0 ${STEP_SPACING - DOT_SIZE - 8}`}
            durationFrames={20}
            height={STEP_SPACING - DOT_SIZE - 8}
            startFrame={step.frame + 10}
            stroke={`${BRAND.fg}40`}
            strokeWidth={1}
            viewBox={`0 0 1 ${STEP_SPACING - DOT_SIZE - 8}`}
            width={1}
          />
          <div
            style={{
              position: "absolute",
              left: -2,
              top: 0,
              width: 5,
              height: STEP_SPACING - DOT_SIZE - 8,
              background: `linear-gradient(to bottom, ${step.color}30, transparent)`,
              filter: "blur(3px)",
              opacity: interpolate(
                frame,
                [step.frame + 10, step.frame + 30],
                [0, 0.6],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              pointerEvents: "none",
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: DOT_X + DOT_SIZE / 2 + 24,
          top: dotY - 2,
          transform: `translateX(${labelX + glitchOffset}px)`,
          opacity: labelOpacity,
        }}
      >
        <TextReveal
          color={BRAND.fg}
          fontFamily={FONTS.sans}
          fontSize={18}
          mode="words"
          staggerFrames={3}
          startFrame={step.frame + 3}
          style={{ fontWeight: 500, lineHeight: 1.4 }}
          text={step.label}
        />
      </div>
    </div>
  );
};

const BOTTOM_STATS = [
  "100+ composable tools",
  "Temporal-backed reliability",
  "Zero human intervention",
];

const TypewriteStat: React.FC<{
  text: string;
  startFrame: number;
}> = ({ text, startFrame }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(text.length, Math.floor(elapsed * 0.8));
  const visibleText = text.slice(0, charCount);
  const opacity = interpolate(frame, [startFrame, startFrame + 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        fontFamily: FONTS.mono,
        fontSize: 12,
        fontWeight: 400,
        color: BRAND.fgMuted,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        opacity,
      }}
    >
      {visibleText}
    </span>
  );
};

export const SlideDemoPhysical: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gradientOpacity = interpolate(frame, [0, 15], [0, 1], {
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

  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finalStepFrame = TIMELINE_STEPS.at(-1).frame;

  return (
    <SlideLayout label="Agents — Autonomous Workflows">
      <div style={{ opacity: gradientOpacity * fadeOut }}>
        <GradientBg colors={[BRAND.blue]} opacity={0.03} speed={0.3} />
      </div>
      <ParticleField count={15} opacity={0.05} size={1} speed={0.1} />
      <GrainOverlay opacity={0.04} />

      <ScanLine
        color={`${BRAND.fg}15`}
        durationFrames={200}
        glowSize={15}
        startFrame={10}
        thickness={1}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "110px 80px 60px",
          opacity: fadeOut,
        }}
      >
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div
            style={{
              position: "absolute",
              left: -60,
              top: -30,
              width: 400,
              height: 160,
              background: `radial-gradient(ellipse, ${BRAND.blue}10 0%, transparent 70%)`,
              filter: "blur(40px)",
              opacity: interpolate(frame, [20, 40], [0, 0.4], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              pointerEvents: "none",
            }}
          />
          <ScrambleTime durationFrames={30} startFrame={20} text="3:47 AM" />
        </div>

        <div style={{ marginTop: 4 }}>
          <TextReveal
            color={BRAND.fg}
            fontFamily={FONTS.serif}
            fontSize={44}
            mode="words"
            staggerFrames={3}
            startFrame={52}
            style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
            text="— an agent prevents a $200K failure."
          />
        </div>

        <div style={{ opacity: subtextOpacity, marginTop: 14 }}>
          <p
            style={{
              fontFamily: FONTS.sans,
              fontSize: 16,
              fontWeight: 400,
              color: BRAND.fgMuted,
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 720,
            }}
          >
            Vibration sensor on CNC Mill 12 spikes 2.3&sigma;. OpenBeam agent
            correlates with maintenance history, finds this pattern preceded a
            bearing failure on Mill 9 last quarter. Files a P2 ticket, alerts
            the night shift lead on Slack, and schedules a parts order &mdash;
            before anyone wakes up.
          </p>
        </div>

        <CameraMove
          durationFrames={15}
          intensity={0.3}
          startFrame={finalStepFrame}
          type="shake"
        >
          <div
            style={{
              marginTop: 32,
              paddingLeft: 40,
              position: "relative",
              height: TIMELINE_STEPS.length * STEP_SPACING,
            }}
          >
            {TIMELINE_STEPS.map((step, i) => (
              <TimelineStep
                index={i}
                isLast={i === TIMELINE_STEPS.length - 1}
                key={step.label}
                step={step}
              />
            ))}
          </div>
        </CameraMove>

        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 80,
            right: 80,
            display: "flex",
            justifyContent: "center",
            gap: 32,
          }}
        >
          {BOTTOM_STATS.map((stat, i) => (
            <span
              key={stat}
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <TypewriteStat startFrame={175 + i * 12} text={stat} />
              {i < BOTTOM_STATS.length - 1 && (
                <span
                  style={{
                    marginLeft: 32,
                    color: BRAND.border,
                    fontFamily: FONTS.mono,
                    fontSize: 12,
                    opacity: interpolate(
                      frame,
                      [175 + i * 12, 178 + i * 12],
                      [0, 0.5],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    ),
                  }}
                >
                  &middot;
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <Vignette intensity={0.6} size={0.35} />
    </SlideLayout>
  );
};
