import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";

interface CinematicTransitionProps {
  type: "wipe" | "zoom" | "blur" | "dissolve";
  progress: number;
}

function seededNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43_758.5453;
  return n - Math.floor(n);
}

const WipeTransition: React.FC<{ progress: number }> = ({ progress }) => {
  const reveal = interpolate(progress, [0, 1], [100, 0]);
  return (
    <AbsoluteFill
      style={{
        clipPath: `inset(0 ${reveal}% 0 0)`,
      }}
    />
  );
};

const ZoomTransition: React.FC<{ progress: number }> = ({ progress }) => {
  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const blur = interpolate(progress, [0, 0.6], [15, 0], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(progress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        filter: `blur(${blur}px)`,
        opacity,
      }}
    />
  );
};

const BlurTransition: React.FC<{ progress: number }> = ({ progress }) => {
  const blur = interpolate(progress, [0, 0.5, 1], [0, 20, 0]);
  const opacity = interpolate(progress, [0, 0.5, 1], [1, 0.3, 1]);

  return (
    <AbsoluteFill
      style={{
        filter: `blur(${blur}px)`,
        opacity,
      }}
    />
  );
};

const DissolveTransition: React.FC<{ progress: number }> = ({ progress }) => {
  const gridSize = 40;
  const cols = Math.ceil(1920 / gridSize);
  const rows = Math.ceil(1080 / gridSize);
  const cells: React.ReactNode[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const threshold = seededNoise(col, row);
      const visible = progress > threshold ? 1 : 0;
      cells.push(
        <div
          key={row * cols + col}
          style={{
            position: "absolute",
            left: col * gridSize,
            top: row * gridSize,
            width: gridSize,
            height: gridSize,
            background: "#000",
            opacity: 1 - visible,
          }}
        />
      );
    }
  }

  return <AbsoluteFill style={{ overflow: "hidden" }}>{cells}</AbsoluteFill>;
};

export const CinematicTransition: React.FC<CinematicTransitionProps> = ({
  type,
  progress,
}) => {
  switch (type) {
    case "wipe":
      return <WipeTransition progress={progress} />;
    case "zoom":
      return <ZoomTransition progress={progress} />;
    case "blur":
      return <BlurTransition progress={progress} />;
    case "dissolve":
      return <DissolveTransition progress={progress} />;
    default:
      break;
  }
};
