import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BlurReveal,
  CameraMove,
  GradientBg,
  GrainOverlay,
  ParticleField,
  PulseRing,
  ScanLine,
  ScrambleText,
  Stagger,
  TextReveal,
  Vignette,
} from "../../components";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";
import { SlideLayout } from "./slide-layout";

const CHART_X = 60;
const CHART_Y = 40;
const CHART_W = 720;
const CHART_H = 220;

const sCurve = (
  x: number,
  plateau: number,
  steepness: number,
  midpoint: number
): number => plateau / (1 + Math.exp(-steepness * (x - midpoint)));

const buildCurvePath = (
  plateau: number,
  steepness: number,
  midpoint: number
): string => {
  const points: string[] = [];
  const steps = 60;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = CHART_X + t * CHART_W;
    const val = sCurve(t, plateau, steepness, midpoint);
    const y = CHART_Y + CHART_H - (val / 1.1) * CHART_H;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return points.join(" ");
};

const buildAreaPath = (
  plateau: number,
  steepness: number,
  midpoint: number
): string => {
  const curvePath = buildCurvePath(plateau, steepness, midpoint);
  const endX = CHART_X + CHART_W;
  const baseY = CHART_Y + CHART_H;
  return `${curvePath} L ${endX} ${baseY} L ${CHART_X} ${baseY} Z`;
};

const CURVES = [
  {
    plateau: 0.35,
    steepness: 8,
    midpoint: 0.2,
    path: buildCurvePath(0.35, 8, 0.2),
    color: BRAND.fgMuted,
    label: "Enterprise Search",
    value: "$7B → $11B",
    dash: "none" as const,
    opacity: 0.5,
    width: 2,
    drawStart: 95,
    drawDuration: 35,
  },
  {
    plateau: 0.75,
    steepness: 6,
    midpoint: 0.5,
    path: buildCurvePath(0.75, 6, 0.5),
    areaPath: buildAreaPath(0.75, 6, 0.5),
    color: BRAND.fg,
    label: "Physical Ops",
    value: "$50B+",
    dash: "none" as const,
    opacity: 1,
    width: 3,
    drawStart: 115,
    drawDuration: 25,
  },
  {
    plateau: 1.0,
    steepness: 5,
    midpoint: 0.65,
    path: buildCurvePath(1.0, 5, 0.65),
    color: BRAND.fg,
    label: "Edge AI",
    value: "$143B by 2034",
    dash: "8 6" as const,
    opacity: 0.4,
    width: 1.5,
    drawStart: 155,
    drawDuration: 30,
  },
];

const TICK_LABELS = [
  { x: 140, label: "NOW" },
  { x: 370, label: "YEAR 2-3" },
  { x: 600, label: "YEAR 5+" },
];

const CURVE_LENGTH = 1200;

const OVERTAKE_FRAME = 130;

const TypeInLabel: React.FC<{
  text: string;
  startFrame: number;
  x: number;
  y: number;
}> = ({ text, startFrame, x, y }) => {
  const frame = useCurrentFrame();
  const charCount = text.length;
  const charsVisible = Math.min(
    charCount,
    Math.max(
      0,
      Math.floor(
        interpolate(
          frame,
          [startFrame, startFrame + charCount * 2],
          [0, charCount],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      )
    )
  );

  const opacity = interpolate(frame, [startFrame, startFrame + 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <text
      fill={BRAND.fgMuted}
      fontFamily={FONTS.mono}
      fontSize={10}
      letterSpacing="0.1em"
      opacity={opacity}
      textAnchor="middle"
      x={x}
      y={y}
    >
      {text.slice(0, charsVisible)}
      {charsVisible < charCount && charsVisible > 0 ? "▌" : ""}
    </text>
  );
};

export const SlideMarket: React.FC = () => {
  const frame = useCurrentFrame();

  const scanLineStart = 70;
  const axesRevealStart = 78;

  const xAxisProgress = interpolate(
    frame,
    [axesRevealStart, axesRevealStart + 15],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const yAxisProgress = interpolate(
    frame,
    [axesRevealStart + 5, axesRevealStart + 18],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const chartRevealOpacity = interpolate(
    frame,
    [axesRevealStart - 5, axesRevealStart + 5],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const subtextOpacity = interpolate(frame, [60, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const areaFillOpacity = interpolate(frame, [135, 155], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const overtakeFlash = interpolate(
    frame,
    [OVERTAKE_FRAME, OVERTAKE_FRAME + 3, OVERTAKE_FRAME + 8],
    [0, 0.3, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const legendVisible = frame >= 195;

  const physicalOpsEndY =
    CHART_Y + CHART_H - (sCurve(1, 0.75, 6, 0.5) / 1.1) * CHART_H;
  const physicalOpsDone = CURVES[1].drawStart + CURVES[1].drawDuration;

  return (
    <SlideLayout label="Market">
      <GradientBg colors={[BRAND.blue, BRAND.green]} opacity={0.06} />
      <ParticleField count={100} opacity={0.1} size={1.2} speed={0.2} />
      <GrainOverlay opacity={0.03} />

      <CameraMove
        durationFrames={130}
        intensity={0.6}
        startFrame={85}
        type="zoom"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "100px 80px 60px",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 900,
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
                MARKET
              </span>
            </BlurReveal>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={64}
                mode="words"
                staggerFrames={3}
                startFrame={25}
                style={{ lineHeight: 1.12 }}
                text="A "
              />
              <ScrambleText
                charset="$0123456789B"
                color={BRAND.fg}
                durationFrames={20}
                fontFamily={FONTS.serif}
                fontSize={64}
                startFrame={28}
                style={{ lineHeight: 1.12, display: "inline-block" }}
                text="$7B"
              />
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={64}
                mode="words"
                staggerFrames={3}
                startFrame={33}
                style={{ lineHeight: 1.12 }}
                text=" market Glean proved."
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={64}
                mode="words"
                staggerFrames={3}
                startFrame={45}
                style={{ lineHeight: 1.12 }}
                text="A "
              />
              <div
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "baseline",
                }}
              >
                <ScrambleText
                  charset="$0123456789B+"
                  color={BRAND.fg}
                  durationFrames={25}
                  fontFamily={FONTS.serif}
                  fontSize={64}
                  startFrame={48}
                  style={{ lineHeight: 1.12, display: "inline-block" }}
                  text="$50B+"
                />
              </div>
              <TextReveal
                color={BRAND.fg}
                fontFamily={FONTS.serif}
                fontSize={64}
                mode="words"
                staggerFrames={3}
                startFrame={53}
                style={{ lineHeight: 1.12 }}
                text=" market no one serves."
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
                Beachhead: 47,000 US manufacturers. $50K ACV. $2.4B serviceable.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              marginTop: 32,
            }}
          >
            <div style={{ opacity: chartRevealOpacity, position: "relative" }}>
              {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
              <svg height={320} viewBox="0 0 840 320" width={840}>
                <defs>
                  <linearGradient
                    id="physicalOpsGradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={BRAND.fg} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={BRAND.fg} stopOpacity={0} />
                  </linearGradient>
                  <filter id="curveGlow">
                    <feGaussianBlur result="blur" stdDeviation="4" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <line
                  stroke={BRAND.border}
                  strokeWidth={1}
                  x1={CHART_X}
                  x2={CHART_X + CHART_W * xAxisProgress}
                  y1={CHART_Y + CHART_H}
                  y2={CHART_Y + CHART_H}
                />

                <line
                  stroke={BRAND.border}
                  strokeWidth={1}
                  x1={CHART_X}
                  x2={CHART_X}
                  y1={CHART_Y + CHART_H}
                  y2={CHART_Y + CHART_H - CHART_H * yAxisProgress}
                />

                {TICK_LABELS.map((tick) => (
                  <g key={tick.label}>
                    <line
                      opacity={xAxisProgress}
                      stroke={BRAND.border}
                      strokeWidth={1}
                      x1={tick.x}
                      x2={tick.x}
                      y1={CHART_Y + CHART_H}
                      y2={CHART_Y + CHART_H + 6}
                    />
                    <TypeInLabel
                      startFrame={
                        axesRevealStart + 10 + TICK_LABELS.indexOf(tick) * 6
                      }
                      text={tick.label}
                      x={tick.x}
                      y={CHART_Y + CHART_H + 24}
                    />
                  </g>
                ))}

                {CURVES[1].areaPath && (
                  <path
                    d={CURVES[1].areaPath}
                    fill="url(#physicalOpsGradient)"
                    opacity={areaFillOpacity}
                  />
                )}

                {CURVES.map((curve, curveIndex) => {
                  const drawProgress = interpolate(
                    frame,
                    [curve.drawStart, curve.drawStart + curve.drawDuration],
                    [CURVE_LENGTH, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );

                  const endY =
                    CHART_Y +
                    CHART_H -
                    (sCurve(1, curve.plateau, curve.steepness, curve.midpoint) /
                      1.1) *
                      CHART_H;

                  const labelOpacity = interpolate(
                    frame,
                    [
                      curve.drawStart + curve.drawDuration - 5,
                      curve.drawStart + curve.drawDuration + 5,
                    ],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );

                  const isDashed = curve.dash !== "none";

                  return (
                    <g key={curve.label}>
                      {curveIndex === 1 && (
                        <path
                          d={curve.path}
                          fill="none"
                          filter="url(#curveGlow)"
                          opacity={curve.opacity * 0.3}
                          stroke={curve.color}
                          strokeDasharray={CURVE_LENGTH}
                          strokeDashoffset={drawProgress}
                          strokeLinecap="round"
                          strokeWidth={curve.width + 6}
                        />
                      )}

                      <path
                        d={curve.path}
                        fill="none"
                        opacity={curve.opacity}
                        stroke={curve.color}
                        strokeDasharray={isDashed ? curve.dash : CURVE_LENGTH}
                        strokeDashoffset={isDashed ? undefined : drawProgress}
                        strokeLinecap="round"
                        strokeWidth={curve.width}
                        style={
                          isDashed
                            ? {
                                strokeDashoffset: drawProgress,
                              }
                            : undefined
                        }
                      />

                      {drawProgress < 10 && (
                        <circle
                          cx={CHART_X + CHART_W}
                          cy={endY}
                          fill={curve.color}
                          opacity={curve.opacity}
                          r={curveIndex === 1 ? 5 : 4}
                        />
                      )}

                      <text
                        fill={curve.color}
                        fontFamily={FONTS.mono}
                        fontSize={11}
                        opacity={labelOpacity * curve.opacity}
                        x={CHART_X + CHART_W + 12}
                        y={endY + 4}
                      >
                        {curve.value}
                      </text>
                    </g>
                  );
                })}

                {frame >= physicalOpsDone && (
                  <PulseRing
                    color={BRAND.fg}
                    count={3}
                    size={60}
                    staggerFrames={6}
                    startFrame={physicalOpsDone}
                    x={CHART_X + CHART_W + 50}
                    y={physicalOpsEndY + 4}
                  />
                )}
              </svg>

              {overtakeFlash > 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at 70% 40%, ${BRAND.fg}${Math.round(
                      overtakeFlash * 255
                    )
                      .toString(16)
                      .padStart(2, "0")} 0%, transparent 60%)`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>

            {legendVisible && (
              <Stagger
                distance={16}
                from="bottom"
                staggerFrames={6}
                startFrame={195}
                style={{
                  display: "flex",
                  gap: 40,
                  marginTop: 8,
                }}
              >
                {CURVES.map((curve) => (
                  <div
                    key={curve.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
                    <svg height={4} width={28}>
                      <line
                        opacity={curve.opacity}
                        stroke={curve.color}
                        strokeDasharray={
                          curve.dash === "none" ? "none" : curve.dash
                        }
                        strokeWidth={2}
                        x1={0}
                        x2={28}
                        y1={2}
                        y2={2}
                      />
                    </svg>
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 11,
                        fontWeight: 400,
                        color: BRAND.fgMuted,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {curve.label} {curve.value}
                    </span>
                  </div>
                ))}
              </Stagger>
            )}

            <Stagger
              distance={16}
              from="bottom"
              staggerFrames={6}
              startFrame={195}
              style={{
                display: legendVisible ? "none" : "flex",
                gap: 40,
                marginTop: 8,
                opacity: 0,
              }}
            >
              <div />
            </Stagger>
          </div>
        </div>
      </CameraMove>

      <ScanLine
        color={BRAND.blue}
        durationFrames={20}
        glowSize={20}
        startFrame={scanLineStart}
        thickness={2}
      />

      <Vignette intensity={0.35} size={0.35} />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
        }}
      >
        {frame >= 48 + 25 && (
          <PulseRing
            color={BRAND.fg}
            count={2}
            size={80}
            staggerFrames={8}
            startFrame={73}
            x={460}
            y={385}
          />
        )}
      </div>
    </SlideLayout>
  );
};
