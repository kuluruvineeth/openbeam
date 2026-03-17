import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BlurReveal } from "../../components/blur-reveal";
import { GradientBg } from "../../components/gradient-bg";
import { GrainOverlay } from "../../components/grain-overlay";
import { MorphingBlob } from "../../components/morphing-blob";
import { ParticleField } from "../../components/particle-field";
import { TextReveal } from "../../components/text-reveal";
import { Vignette } from "../../components/vignette";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";
import { SlideLayout } from "./slide-layout";

interface FlywheelNode {
  label: string;
  sublabel: string;
  x: number;
  y: number;
}

const NODES: FlywheelNode[] = [
  { label: "DATA GRAVITY", sublabel: "More sources connected", x: 310, y: 10 },
  { label: "INTELLIGENCE", sublabel: "Cross-source patterns", x: 560, y: 175 },
  { label: "DEPENDENCY", sublabel: "Agents built on top", x: 310, y: 340 },
  { label: "DEMAND", sublabel: "Users need more sources", x: 20, y: 175 },
];

const NODE_W = 220;
const NODE_H = 70;

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function seededChar(seed: number): string {
  const idx =
    Math.abs(Math.floor(Math.sin(seed * 9301 + 49_297) * 49_297)) %
    SCRAMBLE_CHARS.length;
  return SCRAMBLE_CHARS[idx];
}

const ScrambleText: React.FC<{
  text: string;
  startFrame: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, durationFrames = 20, style }) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;

  if (elapsed < 0) {
    return <span style={{ ...style, opacity: 0 }}>{text}</span>;
  }

  const progress = Math.min(1, elapsed / durationFrames);
  const resolved = Math.floor(progress * text.length);

  const chars = text.split("").map((ch, i) => {
    if (ch === " ") {
      return ch;
    }
    if (i < resolved) {
      return ch;
    }
    if (progress >= 1) {
      return ch;
    }
    return seededChar(frame * 100 + i);
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return <span style={{ ...style, opacity }}>{chars.join("")}</span>;
};

const HighlightText: React.FC<{
  children: string;
  startFrame: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, startFrame, color = BRAND.pink, style }) => {
  const frame = useCurrentFrame();

  const highlightProgress = interpolate(
    frame,
    [startFrame, startFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <span
      style={{
        ...style,
        position: "relative",
        display: "inline",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: -4,
          right: -4,
          bottom: 0,
          height: "40%",
          background: `${color}30`,
          transform: `scaleX(${highlightProgress})`,
          transformOrigin: "left",
          borderRadius: 2,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

const arrowPath = (from: FlywheelNode, to: FlywheelNode): string => {
  const fx = from.x + NODE_W / 2;
  const fy = from.y + NODE_H / 2;
  const tx = to.x + NODE_W / 2;
  const ty = to.y + NODE_H / 2;

  const mx = (fx + tx) / 2;
  const my = (fy + ty) / 2;

  const dx = tx - fx;
  const dy = ty - fy;
  const nx = -dy * 0.15;
  const ny = dx * 0.15;

  return `M ${fx} ${fy} Q ${mx + nx} ${my + ny} ${tx} ${ty}`;
};

const ARROW_LENGTH = 320;
const CENTER_TEXT = "The knowledge layer becomes infrastructure";

export const SlideMoat: React.FC = () => {
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

  const nodeProgresses = NODES.map((_, i) =>
    spring({
      frame: frame - 80 - i * 12,
      fps,
      config: { damping: 22, stiffness: 90, mass: 0.8 },
    })
  );

  const arrowProgress = interpolate(frame, [120, 170], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const allArrowsDrawn = frame >= 170;
  const rotationAngle = allArrowsDrawn
    ? Math.sin((frame - 170) * 0.015) * 1.5
    : 0;

  const centerTextStart = 145;

  const bottomProgress = spring({
    frame: frame - 175,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const bottomBlur = interpolate(bottomProgress, [0, 1], [12, 0]);
  const bottomOpacity = interpolate(bottomProgress, [0, 0.6], [0, 0.5], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SlideLayout label="Defensibility">
      <div style={{ opacity: gradientOpacity * fadeOut }}>
        <GradientBg colors={[BRAND.pink, BRAND.blue]} opacity={0.05} />
      </div>
      <ParticleField count={40} opacity={0.1} speed={0.2} />
      <GrainOverlay opacity={0.03} />

      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "0 80px",
          opacity: fadeOut,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 700,
          }}
        >
          <BlurReveal maxBlur={16} startFrame={20}>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                fontWeight: 500,
                color: BRAND.pink,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Defensibility
            </span>
          </BlurReveal>

          <div style={{ marginTop: 20 }}>
            <TextReveal
              color={BRAND.fg}
              fontFamily={FONTS.serif}
              fontSize={64}
              mode="words"
              staggerFrames={3}
              startFrame={25}
              style={{ letterSpacing: "-0.01em", lineHeight: 1.12 }}
              text="Once you're the search layer,"
            />
          </div>

          <div style={{ marginTop: 4 }}>
            <TextReveal
              color={BRAND.fg}
              fontFamily={FONTS.serif}
              fontSize={64}
              mode="words"
              staggerFrames={4}
              startFrame={45}
              style={{ letterSpacing: "-0.01em", lineHeight: 1.12 }}
              text="you're infrastructure."
            />
          </div>

          <div style={{ opacity: subtextOpacity, marginTop: 18 }}>
            <p
              style={{
                fontFamily: FONTS.sans,
                fontSize: 18,
                fontWeight: 400,
                color: BRAND.fgMuted,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Glean owns digital search. Samsara owns hardware telemetry. Nobody
              owns the layer between them &mdash; the unified knowledge layer
              that connects digital docs to physical telemetry. We do.
            </p>
          </div>

          <div
            style={{
              opacity: bottomOpacity,
              filter: `blur(${bottomBlur}px)`,
              marginTop: 32,
              willChange: "filter, opacity",
            }}
          >
            <p
              style={{
                fontFamily: FONTS.serif,
                fontSize: 22,
                fontWeight: 400,
                color: BRAND.fgMuted,
                margin: 0,
                lineHeight: 1.6,
                fontStyle: "italic",
                maxWidth: 560,
              }}
            >
              &ldquo;You can switch your CRM. You can switch your ticketing
              tool.{" "}
              <HighlightText color={BRAND.pink} startFrame={190}>
                You don&rsquo;t switch
              </HighlightText>{" "}
              the layer your robots think through.&rdquo;
            </p>
          </div>
        </div>

        <div
          style={{
            width: 820,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MorphingBlob
            color={BRAND.pink}
            complexity={6}
            opacity={0.06}
            size={500}
            speed={0.6}
            x="50%"
            y="50%"
          />

          <div
            style={{
              position: "absolute",
              width: 800,
              height: 440,
              transform: `rotate(${rotationAngle}deg)`,
              transformOrigin: "center center",
              willChange: "transform",
            }}
          >
            {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
            <svg
              height={440}
              style={{ position: "absolute" }}
              viewBox="0 0 800 440"
              width={800}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerHeight="6"
                  markerWidth="8"
                  orient="auto"
                  refX="7"
                  refY="3"
                >
                  <polygon fill={`${BRAND.fg}44`} points="0 0, 8 3, 0 6" />
                </marker>
                <filter id="arrow-glow">
                  <feGaussianBlur result="blur" stdDeviation="3" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {NODES.map((node, i) => {
                const next = NODES[(i + 1) % NODES.length];
                const d = arrowPath(node, next);
                const dashOffset = interpolate(
                  arrowProgress,
                  [i * 0.2, Math.min((i + 1) * 0.25 + 0.1, 1)],
                  [ARROW_LENGTH, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );

                const arrowOpacity = interpolate(
                  arrowProgress,
                  [i * 0.2, i * 0.2 + 0.05],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );

                return (
                  <g key={`arrow-${i}`} opacity={arrowOpacity}>
                    <path
                      d={d}
                      fill="none"
                      filter="url(#arrow-glow)"
                      stroke={`${BRAND.pink}20`}
                      strokeDasharray={ARROW_LENGTH}
                      strokeDashoffset={dashOffset}
                      strokeWidth={6}
                    />
                    <path
                      d={d}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      stroke={`${BRAND.fg}44`}
                      strokeDasharray={ARROW_LENGTH}
                      strokeDashoffset={dashOffset}
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })}
            </svg>

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <ScrambleText
                durationFrames={30}
                startFrame={centerTextStart}
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  color: `${BRAND.fg}40`,
                }}
                text={CENTER_TEXT}
              />
            </div>

            {NODES.map((node, i) => {
              const p = nodeProgresses[i];
              const blurVal = interpolate(p, [0, 1], [12, 0]);
              const scale = interpolate(p, [0, 1], [0.9, 1]);
              const opacity = interpolate(p, [0, 0.5], [0, 1], {
                extrapolateRight: "clamp",
              });

              return (
                <div
                  key={node.label}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: NODE_W,
                    height: NODE_H,
                    border: `1px solid ${BRAND.fg}33`,
                    borderRadius: 6,
                    backgroundColor: BRAND.card,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    transform: `scale(${scale})`,
                    filter: `blur(${blurVal}px)`,
                    opacity,
                    willChange: "transform, filter, opacity",
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 9,
                      fontWeight: 500,
                      color: `${BRAND.fg}66`,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    {node.label}
                  </span>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 14,
                      fontWeight: 400,
                      color: BRAND.fg,
                    }}
                  >
                    {node.sublabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Vignette intensity={0.35} size={0.3} />
    </SlideLayout>
  );
};
