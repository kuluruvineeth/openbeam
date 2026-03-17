import type React from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BlurReveal } from "../../components/blur-reveal";
import { BrowserFrame } from "../../components/browser-frame";
import { CameraMove } from "../../components/camera-move";
import { ChromaticAberration } from "../../components/chromatic-aberration";
import { FilmBars } from "../../components/film-bars";
import { GradientBg } from "../../components/gradient-bg";
import { GrainOverlay } from "../../components/grain-overlay";
import { ParticleField } from "../../components/particle-field";
import { TextReveal } from "../../components/text-reveal";
import { Vignette } from "../../components/vignette";
import { FONTS } from "../../lib/fonts";
import { BRAND } from "../../lib/theme";
import { SlideLayout } from "./slide-layout";

const SOURCES = [
  "BACnet \u00b7 sensor history",
  "Slack \u00b7 maintenance threads",
  "Confluence \u00b7 equipment manuals",
  "Jira \u00b7 work orders",
  "OPC-UA \u00b7 telemetry",
];

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

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
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  durationFrames = 20,
  fontSize = 14,
  fontFamily = FONTS.mono,
  color = BRAND.fgMuted,
  style,
}) => {
  const frame = useCurrentFrame();
  const elapsed = frame - startFrame;

  if (elapsed < 0) {
    return null;
  }

  const progress = Math.min(1, elapsed / durationFrames);
  const resolved = Math.floor(progress * text.length);

  const chars = text.split("").map((ch, i) => {
    if (ch === " " || ch === "\u00b7") {
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

  return (
    <span
      style={{
        fontFamily,
        fontSize,
        fontWeight: 500,
        color,
        letterSpacing: "0.05em",
        opacity,
        ...style,
      }}
    >
      {chars.join("")}
    </span>
  );
};

export const SlideDemoSearch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gradientOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtextProgress = spring({
    frame: frame - 55,
    fps,
    config: { damping: 26, stiffness: 100, mass: 0.8 },
  });
  const subtextOpacity = interpolate(subtextProgress, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const screenshotProgress = spring({
    frame: frame - 65,
    fps,
    config: { damping: 22, stiffness: 80, mass: 1.2 },
  });
  const screenshotScale = interpolate(screenshotProgress, [0, 1], [0.85, 1]);
  const screenshotBlur = interpolate(screenshotProgress, [0, 1], [12, 0]);
  const screenshotOpacity = interpolate(screenshotProgress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const screenshotShadow = interpolate(screenshotProgress, [0, 1], [0, 100]);

  const glitchFlashFrame = 68;
  const isGlitchFlash =
    frame >= glitchFlashFrame && frame < glitchFlashFrame + 2;

  const filmBarsOpen = frame >= 100;
  const filmBarsProgress = filmBarsOpen
    ? spring({
        frame: frame - 100,
        fps,
        config: { damping: 20, stiffness: 60, mass: 1 },
      })
    : 0;
  const filmBarsRatio = interpolate(filmBarsProgress, [0, 1], [2.35, 16 / 9]);

  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const screenshotContent = (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 960,
          transform: `scale(${screenshotScale})`,
          filter: `blur(${screenshotBlur}px)`,
          opacity: screenshotOpacity,
          boxShadow: `0 ${screenshotShadow * 0.4}px ${screenshotShadow * 1.2}px rgba(0, 0, 0, ${interpolate(screenshotProgress, [0, 1], [0, 0.6])})`,
          willChange: "transform, filter, opacity",
        }}
      >
        <BrowserFrame url="https://app.openbeam.work/search" width={960}>
          <Img
            src={staticFile("hero-screenshot.png")}
            style={{ width: "100%", display: "block" }}
          />
        </BrowserFrame>
      </div>
    </div>
  );

  return (
    <SlideLayout label="Product — Cross-Domain Search">
      <div style={{ opacity: gradientOpacity * fadeOut }}>
        <GradientBg colors={[BRAND.blue]} opacity={0.06} />
      </div>
      <ParticleField count={40} opacity={0.1} speed={0.2} />
      <GrainOverlay opacity={0.03} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "110px 80px 60px",
          opacity: fadeOut,
        }}
      >
        <BlurReveal maxBlur={16} startFrame={20}>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 13,
              fontWeight: 500,
              color: BRAND.blue,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Product — Cross-Domain Search
          </span>
        </BlurReveal>

        <div style={{ marginTop: 20 }}>
          <TextReveal
            color={BRAND.fg}
            fontFamily={FONTS.serif}
            fontSize={56}
            mode="chars"
            staggerFrames={1}
            startFrame={25}
            style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
            text="Ask about a sensor."
          />
        </div>

        <div style={{ marginTop: 4 }}>
          <TextReveal
            color={BRAND.fg}
            fontFamily={FONTS.serif}
            fontSize={56}
            mode="chars"
            staggerFrames={1}
            startFrame={40}
            style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
            text="Get the full picture."
          />
        </div>

        <div style={{ opacity: subtextOpacity, marginTop: 16 }}>
          <p
            style={{
              fontFamily: FONTS.sans,
              fontSize: 18,
              fontWeight: 400,
              color: BRAND.fgMuted,
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 760,
            }}
          >
            BACnet sensor history, the Slack thread where night shift discussed
            it, the Confluence maintenance procedure, and the Jira work order
            &mdash; unified in one result.
          </p>
        </div>

        <div style={{ marginTop: 36, position: "relative" }}>
          <CameraMove
            durationFrames={60}
            intensity={0.6}
            startFrame={65}
            type="zoom"
          >
            {isGlitchFlash ? (
              <ChromaticAberration
                durationFrames={2}
                offset={6}
                startFrame={glitchFlashFrame}
              >
                {screenshotContent}
              </ChromaticAberration>
            ) : (
              screenshotContent
            )}
          </CameraMove>

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
            <Vignette intensity={0.3} size={0.25} />
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {SOURCES.map((source, i) => (
            <ScrambleText
              color={BRAND.fgMuted}
              durationFrames={18}
              fontSize={12}
              key={source}
              startFrame={130 + i * 8}
              text={source}
            />
          ))}
        </div>
      </div>

      {frame >= 65 && frame < 100 && (
        <FilmBars animated ratio={2.35} startFrame={65} />
      )}
      {frame >= 100 && <FilmBars ratio={filmBarsRatio} />}
    </SlideLayout>
  );
};
