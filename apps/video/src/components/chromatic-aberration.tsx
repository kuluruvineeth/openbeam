import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface ChromaticAberrationProps {
  offset?: number;
  startFrame?: number;
  durationFrames?: number;
  children: React.ReactNode;
}

export const ChromaticAberration: React.FC<ChromaticAberrationProps> = ({
  offset = 3,
  startFrame,
  durationFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  let currentOffset = offset;

  if (startFrame !== undefined && durationFrames !== undefined) {
    const decay = interpolate(
      frame,
      [startFrame, startFrame + durationFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    currentOffset = offset * decay;
  }

  if (currentOffset < 0.1) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translateX(${-currentOffset}px)`,
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      >
        <AbsoluteFill style={{ filter: "url(#ca-red)" }}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      >
        <AbsoluteFill style={{ filter: "url(#ca-green)" }}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          transform: `translateX(${currentOffset}px)`,
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      >
        <AbsoluteFill style={{ filter: "url(#ca-blue)" }}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
      <svg height="0" style={{ position: "absolute" }} width="0">
        <defs>
          <filter id="ca-red">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="ca-green">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="ca-blue">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
    </AbsoluteFill>
  );
};
