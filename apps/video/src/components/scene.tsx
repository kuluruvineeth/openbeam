import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND } from "../lib/theme";
import { ColorGrade } from "./color-grade";
import { GradientBg } from "./gradient-bg";
import { GrainOverlay } from "./grain-overlay";
import { ParticleField } from "./particle-field";
import { Vignette } from "./vignette";

type EnterTransition = "fade" | "blur" | "zoom" | "slide-up" | "none";
type ExitTransition = "fade" | "blur" | "zoom" | "slide-down" | "none";
type BackgroundType = "particles" | "gradient" | "grid" | "none";
type ColorGradePreset = "cinematic" | "cold" | "warm" | "midnight" | "none";

interface SceneProps {
  enterTransition?: EnterTransition;
  exitTransition?: ExitTransition;
  enterDuration?: number;
  exitDuration?: number;
  background?: BackgroundType;
  backgroundColors?: string[];
  vignette?: boolean;
  grain?: boolean;
  colorGrade?: ColorGradePreset;
  children: React.ReactNode;
}

export const Scene: React.FC<SceneProps> = ({
  enterTransition = "fade",
  exitTransition = "fade",
  enterDuration = 15,
  exitDuration = 15,
  background = "none",
  backgroundColors,
  vignette = false,
  grain = false,
  colorGrade = "none",
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 30, stiffness: 100, mass: 1 },
    durationInFrames: enterDuration,
  });

  const exitStart = durationInFrames - exitDuration;
  const exitProgress =
    frame >= exitStart
      ? spring({
          frame: frame - exitStart,
          fps,
          config: { damping: 30, stiffness: 100, mass: 1 },
          durationInFrames: exitDuration,
        })
      : 0;

  const enterStyle = buildTransitionStyle(enterTransition, enterProgress, true);
  const exitStyle = buildTransitionStyle(exitTransition, exitProgress, false);

  const contentStyle = mergeTransitionStyles(enterStyle, exitStyle);

  const content = (
    <AbsoluteFill>
      {renderBackground(background, backgroundColors)}
      <AbsoluteFill style={contentStyle}>{children}</AbsoluteFill>
      {vignette && <Vignette intensity={0.4} />}
      {grain && <GrainOverlay opacity={0.04} />}
    </AbsoluteFill>
  );

  if (colorGrade !== "none") {
    return <ColorGrade preset={colorGrade}>{content}</ColorGrade>;
  }

  return content;
};

function renderBackground(
  type: BackgroundType,
  colors?: string[]
): React.ReactNode {
  switch (type) {
    case "particles":
      return <ParticleField count={60} />;
    case "gradient":
      return <GradientBg colors={colors} />;
    case "grid":
      return <GridBackground />;
    case "none":
      return null;
    default:
      break;
  }
}

const GridBackground: React.FC = () => {
  const spacing = 60;
  const cols = Math.ceil(1920 / spacing);
  const rows = Math.ceil(1080 / spacing);

  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= cols; i += 1) {
    lines.push(
      <line
        key={`v${i}`}
        opacity={0.4}
        stroke={BRAND.border}
        strokeWidth={0.5}
        x1={i * spacing}
        x2={i * spacing}
        y1={0}
        y2={1080}
      />
    );
  }
  for (let i = 0; i <= rows; i += 1) {
    lines.push(
      <line
        key={`h${i}`}
        opacity={0.4}
        stroke={BRAND.border}
        strokeWidth={0.5}
        x1={0}
        x2={1920}
        y1={i * spacing}
        y2={i * spacing}
      />
    );
  }

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
      <svg
        height={1080}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        width={1920}
      >
        {lines}
      </svg>
    </AbsoluteFill>
  );
};

function buildTransitionStyle(
  transition: EnterTransition | ExitTransition,
  progress: number,
  isEnter: boolean
): React.CSSProperties {
  const t = isEnter ? progress : 1 - progress;

  switch (transition) {
    case "fade":
      return { opacity: t };
    case "blur": {
      const blur = interpolate(t, [0, 1], [20, 0]);
      return { opacity: t, filter: `blur(${blur}px)` };
    }
    case "zoom": {
      const scale = interpolate(t, [0, 1], [0.8, 1]);
      return { opacity: t, transform: `scale(${scale})` };
    }
    case "slide-up": {
      const y = interpolate(t, [0, 1], [80, 0]);
      return { opacity: t, transform: `translateY(${y}px)` };
    }
    case "slide-down": {
      const y = interpolate(t, [0, 1], [-80, 0]);
      return { opacity: t, transform: `translateY(${y}px)` };
    }
    case "none":
      return {};
    default:
      return {};
  }
}

function mergeTransitionStyles(
  enter: React.CSSProperties,
  exit: React.CSSProperties
): React.CSSProperties {
  const merged: React.CSSProperties = {
    willChange: "transform, filter, opacity",
  };

  const enterOpacity = enter.opacity ?? 1;
  const exitOpacity = exit.opacity ?? 1;
  merged.opacity = (enterOpacity as number) * (exitOpacity as number);

  const transforms = [enter.transform, exit.transform].filter(Boolean);
  if (transforms.length > 0) {
    merged.transform = transforms.join(" ");
  }

  const filters = [enter.filter, exit.filter].filter(Boolean);
  if (filters.length > 0) {
    merged.filter = filters.join(" ");
  }

  return merged;
}
