import { appLogos } from "@openbeam/integrations/logos";
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
  Glow,
  GradientBg,
  GrainOverlay,
  MorphingBlob,
  ParticleField,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";

const logoEntries = Object.entries(appLogos);

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43_758.5453;
  return x - Math.floor(x);
}

function seededRange(seed: number, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min);
}

const LOGO_COUNT = 36;
const SCENE_DURATION = 210;
const PULSE_INTERVAL = 60;

interface LogoPlacement {
  key: string;
  Logo: React.FC<{ size?: number }>;
  x: number;
  y: number;
  size: number;
  layer: number;
  phase: number;
  driftSpeedX: number;
  driftSpeedY: number;
  driftAmplitudeX: number;
  driftAmplitudeY: number;
  entranceDelay: number;
  rotationSpeed: number;
  rotationPhase: number;
  pulseSlot: number;
}

function generatePlacements(): LogoPlacement[] {
  const selected = logoEntries
    .filter(([key]) => key !== "CUSTOM")
    .slice(0, LOGO_COUNT);

  const placements: LogoPlacement[] = [];

  for (let i = 0; i < selected.length; i += 1) {
    const [key, Logo] = selected[i];
    const seed = i * 7 + 13;

    let layer = 2;
    if (i < 12) {
      layer = 0;
    } else if (i < 24) {
      layer = 1;
    }

    const sizeByLayer = [
      seededRange(seed + 1, 52, 68),
      seededRange(seed + 2, 40, 50),
      seededRange(seed + 3, 32, 42),
    ];

    const col = i % 6;
    const row = Math.floor(i / 6);
    const cellW = 1920 / 6;
    const cellH = 800 / 6;
    const baseX = col * cellW + cellW * 0.5;
    const baseY = row * cellH + cellH * 0.5 + 100;
    const jitterX = seededRange(seed + 10, -cellW * 0.3, cellW * 0.3);
    const jitterY = seededRange(seed + 11, -cellH * 0.25, cellH * 0.25);

    placements.push({
      key,
      Logo: Logo as React.FC<{ size?: number }>,
      x: baseX + jitterX,
      y: baseY + jitterY,
      size: sizeByLayer[layer],
      layer,
      phase: seededRange(seed + 20, 0, Math.PI * 2),
      driftSpeedX: seededRange(seed + 30, 0.018, 0.042),
      driftSpeedY: seededRange(seed + 31, 0.022, 0.048),
      driftAmplitudeX: seededRange(seed + 40, 14, 30),
      driftAmplitudeY: seededRange(seed + 41, 10, 24),
      entranceDelay: layer * 5 + seededRange(seed + 50, 0, 14),
      rotationSpeed: seededRange(seed + 60, 0.008, 0.018),
      rotationPhase: seededRange(seed + 61, 0, Math.PI * 2),
      pulseSlot: Math.floor(seededRange(seed + 70, 0, LOGO_COUNT)),
    });
  }

  return placements;
}

const PLACEMENTS = generatePlacements();

const LAYER_OPACITY = [0.9, 0.55, 0.3];

const LogoNode: React.FC<{ placement: LogoPlacement; totalLogos: number }> = ({
  placement,
  totalLogos,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entryProgress = spring({
    frame: Math.max(0, frame - placement.entranceDelay),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.7 },
  });

  const entryOpacity = interpolate(entryProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const entryScale = interpolate(entryProgress, [0, 1], [0.2, 1]);
  const entryBlur = interpolate(entryProgress, [0, 0.6], [16, 0], {
    extrapolateRight: "clamp",
  });

  const flashIntensity = interpolate(
    entryProgress,
    [0.3, 0.5, 0.8],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const entranceFlash = placement.layer === 0 ? flashIntensity * 0.4 : 0;

  const driftX =
    Math.sin(frame * placement.driftSpeedX + placement.phase) *
    placement.driftAmplitudeX;
  const driftY =
    Math.cos(frame * placement.driftSpeedY + placement.phase + 1.3) *
    placement.driftAmplitudeY;

  const breathe = 1 + Math.sin(frame * 0.06 + placement.phase * 2) * 0.06;

  const rotation =
    Math.sin(frame * placement.rotationSpeed + placement.rotationPhase) * 3;

  const pulsePhase = Math.floor(frame / PULSE_INTERVAL) % totalLogos;
  const isPulsing = placement.pulseSlot === pulsePhase;
  const pulseFrame = frame % PULSE_INTERVAL;
  const pulseGlow = isPulsing
    ? interpolate(pulseFrame, [0, 8, 20, 35], [0, 0.5, 0.3, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const baseOpacity = LAYER_OPACITY[placement.layer];
  const finalOpacity = entryOpacity * baseOpacity;

  const glowSize = placement.size * 2.5;
  const glowOpacity = interpolate(entryProgress, [0.3, 0.8], [0, 0.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const totalGlow = glowOpacity + entranceFlash + pulseGlow;

  return (
    <div
      style={{
        position: "absolute",
        left: placement.x,
        top: placement.y,
        transform: `translate(-50%, -50%) translate(${driftX}px, ${driftY}px) scale(${entryScale * breathe}) rotate(${rotation}deg)`,
        opacity: finalOpacity,
        filter: `blur(${entryBlur}px)`,
        willChange: "transform, opacity, filter",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BRAND.fg}20 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          opacity: totalGlow,
          filter: `blur(${glowSize * 0.25}px)`,
          pointerEvents: "none",
        }}
      />
      <placement.Logo size={placement.size} />
    </div>
  );
};

export const SceneLogoWall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterFadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const masterFadeOut = interpolate(frame, [180, SCENE_DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const grainOpacity = interpolate(frame, [0, 10], [0, 0.035], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const particleOpacity = interpolate(frame, [3, 20], [0, 0.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const counterProgress = spring({
    frame: Math.max(0, frame - 40),
    fps,
    config: { damping: 22, stiffness: 80, mass: 1.2 },
  });

  const counterValue = Math.round(
    interpolate(counterProgress, [0, 1], [0, 103])
  );

  const counterBlur = interpolate(counterProgress, [0, 0.4], [16, 0], {
    extrapolateRight: "clamp",
  });

  const counterOpacity = interpolate(counterProgress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <CameraMove
        durationFrames={SCENE_DURATION}
        intensity={0.2}
        startFrame={0}
        type="zoom"
      >
        <AbsoluteFill style={{ opacity: masterFadeIn * masterFadeOut }}>
          <GradientBg
            colors={[BRAND.blue, BRAND.green]}
            opacity={0.04}
            speed={0.4}
          />

          <MorphingBlob
            color={`${BRAND.blue}18`}
            complexity={6}
            opacity={0.08}
            size={700}
            speed={0.3}
            x="30%"
            y="35%"
          />

          <MorphingBlob
            color={`${BRAND.green}12`}
            complexity={4}
            opacity={0.06}
            size={500}
            speed={0.4}
            x="70%"
            y="55%"
          />

          <ParticleField
            count={40}
            opacity={particleOpacity}
            size={0.6}
            speed={0.08}
          />

          <Glow color={BRAND.fg} size={500} startFrame={5} x="50%" y="42%" />

          <GrainOverlay opacity={grainOpacity} />

          <div
            style={{
              position: "absolute",
              inset: 0,
            }}
          >
            {PLACEMENTS.map((placement) => (
              <LogoNode
                key={placement.key}
                placement={placement}
                totalLogos={LOGO_COUNT}
              />
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 180,
              left: 0,
              right: 0,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <BlurReveal maxBlur={16} startFrame={40}>
              <div
                style={{
                  filter: `blur(${counterBlur}px)`,
                  opacity: counterOpacity,
                  willChange: "filter, opacity",
                }}
              >
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 64,
                    fontWeight: 600,
                    color: "#ffffff",
                    lineHeight: 1,
                  }}
                >
                  {counterValue}
                </span>
              </div>
            </BlurReveal>

            <TextReveal
              color={`${BRAND.fg}80`}
              fontFamily={FONTS.sans}
              fontSize={24}
              mode="chars"
              staggerFrames={2}
              startFrame={55}
              style={{
                letterSpacing: "0.1em",
                fontWeight: 400,
                textTransform: "uppercase",
              }}
              text="connectors"
            />
          </div>

          <Vignette intensity={0.5} size={0.35} />
        </AbsoluteFill>
      </CameraMove>
    </AbsoluteFill>
  );
};
