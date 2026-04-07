import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FilmGrain, GradientBg, Vignette } from "../demos/gradient-bg";
import { LT } from "../theme";

const STATS = [
  { value: 56, suffix: "", color: LT.blue, label: "MCP tools" },
  { value: 500, suffix: "+", color: LT.purple, label: "Write actions" },
  { value: 103, suffix: "", color: LT.green, label: "Connectors" },
  { value: 7, suffix: "", color: LT.amber, label: "Rich UI views" },
] as const;

function AnimatedCounter({
  target,
  suffix,
  color,
  label,
  index,
}: {
  target: number;
  suffix: string;
  color: string;
  label: string;
  index: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = 10 + index * 10;

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { mass: 1, damping: 20, stiffness: 120 },
    from: 0,
    to: 1,
  });

  const scaleEntrance = spring({
    frame: frame - delay,
    fps,
    config: { mass: 1, damping: 26, stiffness: 200 },
    from: 0.85,
    to: 1,
  });

  const opacity = interpolate(progress, [0, 0.2, 1], [0, 0.6, 1]);
  const displayValue = Math.round(interpolate(progress, [0, 1], [0, target]));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity,
        transform: `scale(${scaleEntrance})`,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          fontFamily: LT.font.mono,
          color,
          letterSpacing: -2,
          lineHeight: 1,
        }}
      >
        {displayValue}
        {suffix}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 500,
          fontFamily: LT.font.sans,
          color: LT.fgDim,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(frame, [130, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBg opacity={0.1} variant="warm" />
      <FilmGrain opacity={0.03} />
      <Vignette intensity={0.5} />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 64,
            alignItems: "flex-start",
          }}
        >
          {STATS.map((stat, i) => (
            <AnimatedCounter
              color={stat.color}
              index={i}
              key={stat.label}
              label={stat.label}
              suffix={stat.suffix}
              target={stat.value}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
