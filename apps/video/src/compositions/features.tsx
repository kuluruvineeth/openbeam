import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Glow } from "../components/glow";
import { BRAND } from "../lib/theme";

interface FeatureCardProps {
  title: string;
  description: string;
  accent: string;
  delay: number;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  accent,
  delay,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const staggerDelay = delay + index * 10;

  const progress = spring({
    frame: frame - staggerDelay,
    fps,
    config: { damping: 24, stiffness: 90, mass: 0.8 },
  });

  const y = interpolate(progress, [0, 1], [50, 0]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        transform: `translateY(${y}px)`,
        opacity,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "32px 28px",
        borderRadius: BRAND.radius,
        border: `1px solid ${BRAND.borderSubtle}`,
        backgroundColor: BRAND.bgCard,
        width: 360,
      }}
    >
      <div
        style={{
          width: 4,
          height: 28,
          borderRadius: 2,
          backgroundColor: accent,
          marginBottom: 4,
        }}
      />
      <h3
        style={{
          fontSize: 24,
          fontWeight: 400,
          color: BRAND.text,
          fontFamily: BRAND.font.display,
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 16,
          color: BRAND.textMuted,
          fontFamily: BRAND.font.sans,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
};

const SectionTitle: React.FC<{ text: string; delay: number }> = ({
  text,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 28, stiffness: 100, mass: 0.8 },
  });

  const y = interpolate(progress, [0, 1], [30, 0]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <h2
      style={{
        fontSize: 56,
        fontWeight: 400,
        color: BRAND.text,
        fontFamily: BRAND.font.display,
        letterSpacing: "-0.02em",
        margin: 0,
        textAlign: "center",
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      {text}
    </h2>
  );
};

const FEATURES = [
  {
    accent: BRAND.blue,
    title: "Universal Search",
    description: "Search across every app, doc, and message in one place.",
  },
  {
    accent: BRAND.pink,
    title: "AI Answers",
    description: "Instant answers grounded in your company's knowledge.",
  },
  {
    accent: BRAND.green,
    title: "100+ Connectors",
    description: "Slack, Gmail, Notion, Jira, Drive — connected in minutes.",
  },
  {
    accent: BRAND.orange,
    title: "Enterprise Security",
    description: "SOC 2 compliant. Data never leaves your infrastructure.",
  },
] as const;

export const OpenBeamFeatures: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [270, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.bg,
        opacity: fadeIn * fadeOut,
      }}
    >
      <Glow color={BRAND.blue} size={500} startFrame={5} x="25%" y="35%" />
      <Glow color={BRAND.pink} size={400} startFrame={15} x="75%" y="65%" />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          padding: 80,
        }}
      >
        <SectionTitle delay={5} text="Everything you need." />

        <div
          style={{
            display: "flex",
            gap: 20,
            justifyContent: "center",
          }}
        >
          {FEATURES.map((feature, i) => (
            <FeatureCard
              accent={feature.accent}
              delay={25}
              description={feature.description}
              index={i}
              key={feature.title}
              title={feature.title}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
