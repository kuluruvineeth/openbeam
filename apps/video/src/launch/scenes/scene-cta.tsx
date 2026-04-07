import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FilmGrain, GradientBg, Vignette } from "../demos/gradient-bg";
import { LT } from "../theme";

const GITHUB_URL = "github.com/kuluruvineeth/openbeam";
const BADGES = ["Open Source", "Self-Hosted", "Apache 2.0"] as const;

function TypedUrl({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsPerFrame = 0.4;
  const visibleChars = Math.min(
    Math.floor(elapsed * charsPerFrame),
    GITHUB_URL.length
  );

  return (
    <div
      style={{
        fontSize: 20,
        fontFamily: LT.font.mono,
        color: LT.blue,
        letterSpacing: 0.5,
        height: 28,
      }}
    >
      {GITHUB_URL.slice(0, visibleChars)}
      {visibleChars < GITHUB_URL.length && (
        <span
          style={{
            opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
            color: LT.fgDim,
          }}
        >
          |
        </span>
      )}
    </div>
  );
}

export const SceneCta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { mass: 1, damping: 24, stiffness: 220 },
    from: 0.8,
    to: 1,
  });

  const logoOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { mass: 1, damping: 22, stiffness: 180 },
    from: 0,
    to: 1,
  });

  const titleScale = interpolate(titleProgress, [0, 1], [0.9, 1]);
  const titleBlur = interpolate(titleProgress, [0, 1], [20, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 0.3, 1], [0, 0.6, 1]);

  const subtitleOpacity = interpolate(frame, [30, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [30, 42], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgesOpacity = interpolate(frame, [100, 112], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgesY = interpolate(frame, [100, 112], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [150, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBg opacity={0.12} variant="warm" />
      <FilmGrain opacity={0.05} />
      <Vignette intensity={0.7} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        >
          <Img src={staticFile("logo.png")} style={{ width: 56, height: 56 }} />
        </div>

        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            filter: `blur(${titleBlur}px)`,
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              fontFamily: LT.font.sans,
              color: LT.fg,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            OpenBeam
          </div>
        </div>

        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontFamily: LT.font.sans,
              color: LT.fgDim,
              fontWeight: 400,
            }}
          >
            Open source enterprise AI search
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <TypedUrl startFrame={55} />
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 16,
            opacity: badgesOpacity,
            transform: `translateY(${badgesY}px)`,
          }}
        >
          {BADGES.map((badge) => (
            <div
              key={badge}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${LT.border}`,
                fontSize: 12,
                fontFamily: LT.font.mono,
                color: LT.fgDim,
                fontWeight: 500,
                letterSpacing: 0.3,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
