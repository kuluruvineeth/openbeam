import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  CameraMove,
  GradientBg,
  GrainOverlay,
  MorphingBlob,
  ParticleField,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";
import { type ClientEntry, MCP_CLIENTS } from "./mcp-client-logos";

const CENTER_X = 960;
const CENTER_Y = 490;
const ORBIT_RADIUS = 380;
const LOGO_SIZE = 80;
const CLIENT_SIZE = 68;
const CLIENT_COUNT = MCP_CLIENTS.length;

const SWEEP_START = 20;
const SWEEP_DURATION = 240;
const SWEEP_END = SWEEP_START + SWEEP_DURATION;
const ORBIT_PHASE = SWEEP_END;
const ORBIT_SPEED = 0.005;

const BREATHE_AMP_PX = 3;
const BREATHE_AMP_SCALE = 0.02;
const BREATHE_PERIOD = 90;

const BEAM_TRAIL_COUNT = 8;
const BEAM_COLOR = BRAND.blue;

const LABEL_START = 190;
const LABEL_STAGGER = 6;
const TAGLINE_START = 220;
const FOOTER_START = 250;
const FADE_OUT_START = 280;

function logoHitFrame(index: number): number {
  const targetProgress = index / CLIENT_COUNT;
  const easedTime = Math.asin(targetProgress * 2 - 1) / Math.PI + 0.5;
  return SWEEP_START + Math.round(easedTime * SWEEP_DURATION);
}

function SweepBeam({ frame }: { frame: number }) {
  const sweepProgress = interpolate(frame, [SWEEP_START, SWEEP_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });

  const handOpacity = interpolate(frame, [SWEEP_END, SWEEP_END + 15], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < SWEEP_START || handOpacity <= 0) {
    return null;
  }

  const sweepAngle = -Math.PI / 2 + sweepProgress * Math.PI * 2;

  const tipX = CENTER_X + Math.cos(sweepAngle) * (ORBIT_RADIUS + 40);
  const tipY = CENTER_Y + Math.sin(sweepAngle) * (ORBIT_RADIUS + 40);

  const orbTipX = CENTER_X + Math.cos(sweepAngle) * ORBIT_RADIUS;
  const orbTipY = CENTER_Y + Math.sin(sweepAngle) * ORBIT_RADIUS;

  return (
    <>
      <svg
        aria-hidden="true"
        height={1080}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        viewBox="0 0 1920 1080"
        width={1920}
      >
        <defs>
          <filter id="beamGlow">
            <feGaussianBlur result="blur" stdDeviation="6" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Array.from({ length: BEAM_TRAIL_COUNT }, (_, t) => {
          const lag = (t + 1) / BEAM_TRAIL_COUNT;
          const trailAngle = sweepAngle - lag * (Math.PI / 6);
          const trailOpacity = (1 - lag) * 0.2 * handOpacity;
          const trailX = CENTER_X + Math.cos(trailAngle) * (ORBIT_RADIUS + 30);
          const trailY = CENTER_Y + Math.sin(trailAngle) * (ORBIT_RADIUS + 30);
          return (
            <line
              key={t}
              stroke={BEAM_COLOR}
              strokeOpacity={trailOpacity}
              strokeWidth={Math.max(0.5, 1.5 - t * 0.15)}
              x1={CENTER_X}
              x2={trailX}
              y1={CENTER_Y}
              y2={trailY}
            />
          );
        })}

        <line
          filter="url(#beamGlow)"
          stroke="white"
          strokeOpacity={0.7 * handOpacity}
          strokeWidth={2}
          x1={CENTER_X}
          x2={tipX}
          y1={CENTER_Y}
          y2={tipY}
        />

        <circle
          cx={orbTipX}
          cy={orbTipY}
          fill="white"
          filter="url(#beamGlow)"
          opacity={0.35 * handOpacity}
          r={10}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: CENTER_X - ORBIT_RADIUS,
          top: CENTER_Y - ORBIT_RADIUS,
          width: ORBIT_RADIUS * 2,
          height: ORBIT_RADIUS * 2,
          borderRadius: "50%",
          background: `conic-gradient(
            from ${(sweepAngle * 180) / Math.PI - 45}deg at 50% 50%,
            transparent 0deg,
            ${BEAM_COLOR}00 0deg,
            ${BEAM_COLOR}20 28deg,
            ${BEAM_COLOR}40 42deg,
            transparent 48deg,
            transparent 360deg
          )`,
          filter: "blur(10px)",
          mixBlendMode: "screen",
          opacity: handOpacity,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: orbTipX,
          top: orbTipY,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, ${BEAM_COLOR}50 40%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(8px)",
          mixBlendMode: "screen",
          opacity: handOpacity,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function ConnectionLines({ frame }: { frame: number }) {
  return (
    <svg
      aria-hidden="true"
      height={1080}
      style={{ position: "absolute", inset: 0 }}
      viewBox="0 0 1920 1080"
      width={1920}
    >
      {MCP_CLIENTS.map((client, i) => {
        const hitFrame = logoHitFrame(i);
        const clientProgress = Math.min(
          1,
          Math.max(0, (frame - hitFrame) / 20)
        );

        if (clientProgress <= 0) {
          return null;
        }

        const baseAngle = (i / CLIENT_COUNT) * Math.PI * 2 - Math.PI / 2;
        const orbitFrame = Math.max(0, frame - ORBIT_PHASE);
        const angle = baseAngle + orbitFrame * ORBIT_SPEED;
        const x = CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
        const y = CENTER_Y + Math.sin(angle) * ORBIT_RADIUS;

        const dotProgress = (frame * 0.02 + i * 0.125) % 1;
        const dotX = CENTER_X + (x - CENTER_X) * dotProgress;
        const dotY = CENTER_Y + (y - CENTER_Y) * dotProgress;

        const lineOpacity = 0.06 * clientProgress;
        const dotOpacity = 0.25 * clientProgress;

        return (
          <g key={client.id}>
            <line
              stroke="white"
              strokeOpacity={lineOpacity}
              strokeWidth={1}
              x1={CENTER_X}
              x2={x}
              y1={CENTER_Y}
              y2={y}
            />
            <circle
              cx={dotX}
              cy={dotY}
              fill="white"
              opacity={dotOpacity}
              r={2}
            />
          </g>
        );
      })}
    </svg>
  );
}

function OrbitingClient({
  client,
  index,
  frame,
  fps,
}: {
  client: ClientEntry;
  index: number;
  frame: number;
  fps: number;
}) {
  const hitFrame = logoHitFrame(index);
  const localFrame = frame - hitFrame;

  const entranceProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.6 },
  });

  if (entranceProgress < 0.01) {
    return null;
  }

  const baseAngle = (index / CLIENT_COUNT) * Math.PI * 2 - Math.PI / 2;
  const orbitFrame = Math.max(0, frame - ORBIT_PHASE);
  const angle = baseAngle + orbitFrame * ORBIT_SPEED;

  const breathePhase = (frame / BREATHE_PERIOD + index * 0.3) * Math.PI * 2;
  const breatheX = Math.sin(breathePhase) * BREATHE_AMP_PX;
  const breatheY = Math.cos(breathePhase * 0.7) * BREATHE_AMP_PX;
  const breatheScale = 1 + Math.sin(breathePhase * 0.5) * BREATHE_AMP_SCALE;

  const x = CENTER_X + Math.cos(angle) * ORBIT_RADIUS + breatheX;
  const y = CENTER_Y + Math.sin(angle) * ORBIT_RADIUS + breatheY;

  const entranceScale = interpolate(entranceProgress, [0, 1], [0.3, 1]);
  const entranceBlur = interpolate(entranceProgress, [0, 0.5], [8, 0], {
    extrapolateRight: "clamp",
  });
  const entranceOpacity = interpolate(entranceProgress, [0, 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });

  const burstProgress = interpolate(localFrame, [0, 4, 22], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const burstSize = interpolate(burstProgress, [0, 1], [0, CLIENT_SIZE * 2.5]);

  const lineDrawProgress = interpolate(localFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineEndX = CENTER_X + (x - CENTER_X) * lineDrawProgress;
  const lineEndY = CENTER_Y + (y - CENTER_Y) * lineDrawProgress;

  const labelFrame = LABEL_START + index * LABEL_STAGGER;
  const labelOpacity = interpolate(
    frame,
    [labelFrame, labelFrame + 15],
    [0, 0.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const labelSlide = interpolate(frame, [labelFrame, labelFrame + 15], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const LogoComponent = client.logo;

  return (
    <>
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <line
          stroke="white"
          strokeOpacity={0.08 * entranceOpacity}
          strokeWidth={1}
          x1={CENTER_X}
          x2={lineEndX}
          y1={CENTER_Y}
          y2={lineEndY}
        />

        {burstProgress > 0 && (
          <circle
            cx={x}
            cy={y}
            fill="none"
            opacity={burstProgress * 0.4}
            r={burstSize}
            stroke="white"
            strokeWidth={1.5}
          />
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: CLIENT_SIZE * 2,
            height: CLIENT_SIZE * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,255,255,${0.08 * entranceOpacity}) 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
            filter: "blur(12px)",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: x - CLIENT_SIZE / 2,
          top: y - CLIENT_SIZE / 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          filter: `blur(${entranceBlur}px)`,
          opacity: entranceOpacity,
          transform: `scale(${entranceScale * breatheScale})`,
          willChange: "transform, filter, opacity",
        }}
      >
        <LogoComponent size={CLIENT_SIZE} />
        <span
          style={{
            marginTop: 10,
            fontFamily: FONTS.mono,
            fontSize: 11,
            fontWeight: 500,
            color: BRAND.fg,
            opacity: labelOpacity,
            transform: `translateY(${labelSlide}px)`,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {client.name}
        </span>
      </div>
    </>
  );
}

function OrbitRing({ frame }: { frame: number }) {
  const ringOpacity = interpolate(
    frame,
    [SWEEP_START - 5, SWEEP_START + 10],
    [0, 0.12],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  if (ringOpacity <= 0) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      height={1080}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      viewBox="0 0 1920 1080"
      width={1920}
    >
      <circle
        cx={CENTER_X}
        cy={CENTER_Y}
        fill="none"
        r={ORBIT_RADIUS}
        stroke={BEAM_COLOR}
        strokeOpacity={ringOpacity}
        strokeWidth={1}
      />
    </svg>
  );
}

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const masterFadeOut = interpolate(frame, [FADE_OUT_START, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 200, mass: 0.8 },
  });
  const logoBlur = interpolate(logoProgress, [0, 1], [20, 0]);
  const logoScale = interpolate(logoProgress, [0, 1], [0.7, 1]);
  const logoOpacity = interpolate(logoProgress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const grainOpacity = interpolate(frame, [0, 20], [0, 0.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const particleOpacity = interpolate(frame, [5, 30], [0, 0.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const gradientOpacity = interpolate(frame, [10, 40], [0, 0.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const blobOpacity = interpolate(frame, [5, 25], [0, 0.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brandTextProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 28, stiffness: 100, mass: 0.8 },
  });
  const brandTextOpacity = interpolate(brandTextProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const brandTextSlide = interpolate(brandTextProgress, [0, 1], [12, 0]);

  const footerOpacity = interpolate(
    frame,
    [FOOTER_START, FOOTER_START + 20],
    [0, 0.3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <CameraMove
        durationFrames={300}
        intensity={0.4}
        startFrame={0}
        type="zoom"
      >
        <AbsoluteFill style={{ opacity: masterFadeOut }}>
          <GradientBg
            colors={[BRAND.blue, BRAND.pink]}
            opacity={gradientOpacity}
            speed={0.8}
          />

          <MorphingBlob
            color={`${BRAND.blue}18`}
            complexity={6}
            opacity={blobOpacity}
            size={500}
            speed={0.6}
            x="50%"
            y="45%"
          />

          <ParticleField
            count={70}
            opacity={particleOpacity}
            size={1}
            speed={0.15}
          />

          <GrainOverlay opacity={grainOpacity} />

          <OrbitRing frame={frame} />

          <ConnectionLines frame={frame} />

          <SweepBeam frame={frame} />

          {MCP_CLIENTS.map((client, i) => (
            <OrbitingClient
              client={client}
              fps={fps}
              frame={frame}
              index={i}
              key={client.id}
            />
          ))}

          <div
            style={{
              position: "absolute",
              left: CENTER_X - LOGO_SIZE / 2,
              top: CENTER_Y - LOGO_SIZE / 2,
              filter: `blur(${logoBlur}px)`,
              transform: `scale(${logoScale})`,
              opacity: logoOpacity,
              willChange: "filter, opacity, transform",
            }}
          >
            <Img
              src={staticFile("logo_dark.png")}
              style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              left: CENTER_X,
              top: CENTER_Y + LOGO_SIZE / 2 + 20,
              transform: `translate(-50%, ${brandTextSlide}px)`,
              opacity: brandTextOpacity,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.serif,
                fontSize: 48,
                fontWeight: 400,
                color: BRAND.fg,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              OpenBeam
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CENTER_Y + LOGO_SIZE / 2 + 90,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <TextReveal
              color={`${BRAND.fg}cc`}
              fontFamily={FONTS.serif}
              fontSize={32}
              mode="words"
              staggerFrames={4}
              startFrame={TAGLINE_START}
              style={{
                letterSpacing: "0.01em",
                fontWeight: 400,
                justifyContent: "center",
              }}
              text="Every AI is our UI"
            />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 80,
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
                color: BRAND.fgMuted,
                letterSpacing: "0.08em",
              }}
            >
              Claude Desktop &middot; Cursor &middot; Codex &middot; Windsurf
              &middot; VS Code &middot; Claude Code &middot; ChatGPT &middot;
              Cline
            </span>
          </div>

          <Vignette intensity={0.5} size={0.35} />
        </AbsoluteFill>
      </CameraMove>
    </AbsoluteFill>
  );
};
