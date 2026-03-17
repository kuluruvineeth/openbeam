import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Glow } from "../components/glow";
import { BRAND } from "../lib/theme";

const Wordmark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 30, stiffness: 80, mass: 1.2 },
  });

  const y = interpolate(progress, [0, 1], [30, 0]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      <h1
        style={{
          fontSize: 88,
          fontWeight: 400,
          color: BRAND.text,
          fontFamily: BRAND.font.display,
          letterSpacing: "-0.02em",
          margin: 0,
          lineHeight: 1,
        }}
      >
        openbeam
      </h1>
    </div>
  );
};

const Tagline: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 28, stiffness: 90, mass: 0.8 },
  });

  const y = interpolate(progress, [0, 1], [20, 0]);
  const opacity = interpolate(progress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <p
      style={{
        fontSize: 32,
        color: BRAND.textMuted,
        fontFamily: BRAND.font.sans,
        fontWeight: 400,
        letterSpacing: "-0.01em",
        margin: 0,
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      Enterprise search, reimagined.
    </p>
  );
};

const AccentLine: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 30, stiffness: 100 },
  });

  const width = interpolate(progress, [0, 1], [0, 120]);
  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        height: 1,
        width,
        opacity,
        backgroundColor: BRAND.border,
      }}
    />
  );
};

export const OpenBeamIntro: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(frame, [150, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.bg,
        opacity: fadeOut,
      }}
    >
      <Glow color={BRAND.blue} size={500} startFrame={5} x="48%" y="44%" />
      <Glow color={BRAND.pink} size={300} startFrame={15} x="54%" y="52%" />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <Sequence from={0}>
          <AbsoluteFill
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
            }}
          >
            <Wordmark />
            <AccentLine delay={30} />
            <Tagline delay={40} />
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
