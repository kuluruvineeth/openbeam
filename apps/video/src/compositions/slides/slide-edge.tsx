import type React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BlurReveal } from "../../components/blur-reveal";
import { CameraMove } from "../../components/camera-move";
import { ChromaticAberration } from "../../components/chromatic-aberration";
import { Glitch } from "../../components/glitch";
import { GradientBg } from "../../components/gradient-bg";
import { GrainOverlay } from "../../components/grain-overlay";
import { ParticleField } from "../../components/particle-field";
import { PulseRing } from "../../components/pulse-ring";
import { TextReveal } from "../../components/text-reveal";
import { Typewriter } from "../../components/typewriter";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";
import { SlideLayout } from "./slide-layout";

interface DeployMode {
  name: string;
  description: string;
  nameColor: string;
  accent: boolean;
  stat?: { from: number; label: string };
}

const MODES: DeployMode[] = [
  {
    name: "Cloud",
    description: "Managed SaaS. Zero infrastructure to manage.",
    nameColor: BRAND.fgMuted,
    accent: false,
  },
  {
    name: "On-Prem",
    description: "Your data center, your rules. SOC 2, DORA, CMMC compliant.",
    nameColor: `${BRAND.fg}bf`,
    accent: false,
  },
  {
    name: "Air-Gapped",
    description:
      "Full search and AI on commodity hardware. Factory floors, defense facilities, offshore vessels.",
    nameColor: BRAND.fg,
    accent: true,
    stat: { from: 1024, label: "bytes egress" },
  },
];

const ROW_ENTER_FRAMES = [75, 95, 118];
const AIR_GAPPED_GLITCH_FRAME = 115;
const COUNTER_START = 125;
const COUNTER_DURATION = 35;

const CountdownStat: React.FC<{
  from: number;
  label: string;
  startFrame: number;
}> = ({ from, label, startFrame }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [startFrame, startFrame + COUNTER_DURATION],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const current = Math.round(from * (1 - progress));
  const opacity = interpolate(frame, [startFrame, startFrame + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isZero = current === 0 && progress >= 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: 48,
          fontFamily: FONTS.mono,
          fontWeight: 600,
          color: isZero ? BRAND.green : BRAND.fg,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          opacity,
          textShadow: isZero ? `0 0 20px ${BRAND.green}60` : "none",
        }}
      >
        {current}
      </span>
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          fontWeight: 400,
          color: `${BRAND.fg}66`,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
    </div>
  );
};

const DeployRow: React.FC<{
  mode: DeployMode;
  index: number;
  enterFrame: number;
}> = ({ mode, index, enterFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isAirGapped = mode.accent;

  const slideProgress = spring({
    frame: frame - enterFrame,
    fps,
    config: isAirGapped
      ? { damping: 12, stiffness: 180, mass: 0.6 }
      : { damping: 22, stiffness: 100, mass: 0.8 },
  });
  const slideY = interpolate(slideProgress, [0, 1], [40, 0]);
  const rowOpacity = interpolate(slideProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  const _prevFade =
    index > 0
      ? interpolate(frame, [enterFrame, enterFrame + 15], [1, 0.85], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const counterDone = isAirGapped && frame >= COUNTER_START + COUNTER_DURATION;

  return (
    <div
      style={{
        transform: `translateY(${slideY}px)`,
        opacity: rowOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "22px 32px",
          border: `1px solid ${mode.accent ? `${BRAND.fg}4d` : BRAND.border}`,
          borderRadius: BRAND.radius,
          backgroundColor: mode.accent ? `${BRAND.fg}0f` : BRAND.card,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {counterDone && isAirGapped && (
          <PulseRing
            color={BRAND.green}
            count={3}
            size={120}
            staggerFrames={5}
            startFrame={COUNTER_START + COUNTER_DURATION}
            x={880}
            y={35}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 14,
              fontWeight: 500,
              color: mode.nameColor,
              letterSpacing: "0.08em",
              width: 120,
            }}
          >
            {mode.name}
          </span>
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 18,
              fontWeight: 400,
              color: `${BRAND.fg}b3`,
              maxWidth: mode.stat ? 540 : 700,
              lineHeight: 1.4,
            }}
          >
            {mode.description}
          </span>
        </div>

        {mode.stat && (
          <CountdownStat
            from={mode.stat.from}
            label={mode.stat.label}
            startFrame={COUNTER_START}
          />
        )}
      </div>
    </div>
  );
};

export const SlideEdge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gradientOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtextProgress = spring({
    frame: frame - 60,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const subtextOpacity = interpolate(subtextProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const bottomProgress = spring({
    frame: frame - 170,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const bottomOpacity = interpolate(bottomProgress, [0, 0.6], [0, 0.5], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isGlitchFrame =
    frame >= AIR_GAPPED_GLITCH_FRAME && frame < AIR_GAPPED_GLITCH_FRAME + 3;
  const isChromaFlash =
    frame >= COUNTER_START + COUNTER_DURATION &&
    frame < COUNTER_START + COUNTER_DURATION + 2;

  const terminalFrame = 150;

  const deployContent = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
        opacity: fadeOut,
      }}
    >
      <BlurReveal maxBlur={16} startFrame={20}>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 13,
            fontWeight: 500,
            color: BRAND.green,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Edge-Native
        </span>
      </BlurReveal>

      <div style={{ marginTop: 20 }}>
        <TextReveal
          color={BRAND.fg}
          fontFamily={FONTS.serif}
          fontSize={64}
          mode="chars"
          staggerFrames={1}
          startFrame={25}
          style={{ letterSpacing: "-0.01em", lineHeight: 1.1 }}
          text="Deploys anywhere."
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <TextReveal
          color={BRAND.fg}
          fontFamily={FONTS.serif}
          fontSize={64}
          mode="chars"
          staggerFrames={2}
          startFrame={42}
          style={{ letterSpacing: "-0.01em", lineHeight: 1.1, fontWeight: 400 }}
          text="Even air-gapped."
        />
      </div>

      <div style={{ opacity: subtextOpacity, marginTop: 16, marginBottom: 28 }}>
        <p
          style={{
            fontFamily: FONTS.sans,
            fontSize: 18,
            fontWeight: 400,
            color: BRAND.fgMuted,
            margin: 0,
            maxWidth: 760,
            lineHeight: 1.5,
          }}
        >
          Most platforms require the cloud. OpenBeam runs fully disconnected
          &mdash; SQLite WAL for storage, BLAKE3 Merkle sync for integrity,
          quantized models for local AI inference. Same search, same agents,
          zero network dependency.
        </p>
      </div>

      <CameraMove
        durationFrames={40}
        intensity={0.4}
        startFrame={AIR_GAPPED_GLITCH_FRAME}
        type="zoom"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MODES.map((mode, i) => (
            <DeployRow
              enterFrame={ROW_ENTER_FRAMES[i]}
              index={i}
              key={mode.name}
              mode={mode}
            />
          ))}
        </div>
      </CameraMove>

      <div style={{ marginTop: 20 }}>
        <Typewriter
          color={BRAND.green}
          fontFamily={FONTS.mono}
          fontSize={14}
          speed={0.6}
          startFrame={terminalFrame}
          style={{ opacity: 0.7 }}
          text="$ openbeam deploy --mode air-gapped"
        />
      </div>
    </div>
  );

  let wrappedContent: React.ReactNode = deployContent;
  if (isGlitchFrame) {
    wrappedContent = (
      <Glitch
        durationFrames={3}
        intensity={0.8}
        slices={4}
        startFrame={AIR_GAPPED_GLITCH_FRAME}
      >
        {deployContent}
      </Glitch>
    );
  } else if (isChromaFlash) {
    wrappedContent = (
      <ChromaticAberration
        durationFrames={2}
        offset={4}
        startFrame={COUNTER_START + COUNTER_DURATION}
      >
        {deployContent}
      </ChromaticAberration>
    );
  }

  return (
    <SlideLayout label="Edge-Native">
      <div style={{ opacity: gradientOpacity * fadeOut }}>
        <GradientBg colors={[BRAND.green, BRAND.blue]} opacity={0.05} />
      </div>
      <ParticleField count={45} opacity={0.1} speed={0.25} />
      <GrainOverlay opacity={0.03} />

      {wrappedContent}

      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 80,
          right: 80,
          textAlign: "center",
          opacity: bottomOpacity * fadeOut,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            fontWeight: 400,
            color: `${BRAND.fg}b3`,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {
            "< 200ms p99 on 500K+ docs \u00b7 x86/ARM, 8GB RAM minimum \u00b7 Tamper-proof BLAKE3 integrity"
          }
        </span>
      </div>
    </SlideLayout>
  );
};
