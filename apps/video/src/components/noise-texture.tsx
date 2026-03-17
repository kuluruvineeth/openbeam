import type React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface NoiseTextureProps {
  type: "film" | "digital" | "halftone";
  opacity?: number;
  speed?: number;
  scale?: number;
}

function buildFilmNoise(seed: number): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='6' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='matrix' values='1 0 0 0 0.03  0 0.9 0 0 0.01  0 0 0.8 0 0  0 0 0 0.6 0'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>`;
}

function buildDigitalNoise(seed: number): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='turbulence' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>`;
}

function buildHalftone(dotCount: number, seed: number): string {
  const cellSize = 200 / dotCount;
  let circles = "";
  for (let row = 0; row < dotCount; row += 1) {
    for (let col = 0; col < dotCount; col += 1) {
      const cx = col * cellSize + cellSize / 2;
      const cy = row * cellSize + cellSize / 2;
      const idx = row * dotCount + col;
      const r = seededRandom(seed + idx) * cellSize * 0.4;
      circles += `<circle cx='${cx}' cy='${cy}' r='${r}' fill='white'/>`;
    }
  }
  return `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='black'/>${circles}</svg>`;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49_297) * 49_297;
  return x - Math.floor(x);
}

const TILE_SIZES: Record<string, number> = {
  film: 300,
  digital: 200,
  halftone: 200,
};

export const NoiseTexture: React.FC<NoiseTextureProps> = ({
  type,
  opacity = 0.06,
  speed = 1,
  scale = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const seed = Math.floor((frame * speed) / (fps / 10)) % 200;
  const tileSize = TILE_SIZES[type] * scale;

  let svg: string;
  if (type === "film") {
    svg = buildFilmNoise(seed);
  } else if (type === "digital") {
    svg = buildDigitalNoise(seed);
  } else {
    svg = buildHalftone(20, seed);
  }

  const encoded = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  const offsetX = (seed * 7.3) % tileSize;
  const offsetY = (seed * 13.7) % tileSize;

  return (
    <AbsoluteFill
      style={{
        backgroundImage: encoded,
        backgroundSize: `${tileSize}px ${tileSize}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        opacity,
        mixBlendMode: type === "halftone" ? "multiply" : "overlay",
        pointerEvents: "none",
      }}
    />
  );
};
