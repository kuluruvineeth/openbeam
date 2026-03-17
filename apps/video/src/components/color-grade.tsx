import type React from "react";
import { AbsoluteFill } from "remotion";

type ColorPreset =
  | "cinematic"
  | "teal-orange"
  | "cold"
  | "warm"
  | "desaturated"
  | "high-contrast"
  | "noir"
  | "midnight";

interface ColorGradeProps {
  preset: ColorPreset;
  intensity?: number;
  children: React.ReactNode;
}

interface FilterValues {
  brightness: number;
  contrast: number;
  saturate: number;
  sepia: number;
  hueRotate: number;
}

const IDENTITY: FilterValues = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  sepia: 0,
  hueRotate: 0,
};

const PRESETS: Record<ColorPreset, FilterValues> = {
  cinematic: {
    brightness: 0.95,
    contrast: 1.1,
    saturate: 1.2,
    sepia: 0,
    hueRotate: 0,
  },
  "teal-orange": {
    brightness: 1,
    contrast: 1,
    saturate: 1.3,
    sepia: 0.15,
    hueRotate: -10,
  },
  cold: {
    brightness: 1.05,
    contrast: 1,
    saturate: 0.8,
    sepia: 0,
    hueRotate: 10,
  },
  warm: {
    brightness: 1.02,
    contrast: 1,
    saturate: 1.1,
    sepia: 0.1,
    hueRotate: 0,
  },
  desaturated: {
    brightness: 1,
    contrast: 1.15,
    saturate: 0.4,
    sepia: 0,
    hueRotate: 0,
  },
  "high-contrast": {
    brightness: 0.9,
    contrast: 1.4,
    saturate: 1,
    sepia: 0,
    hueRotate: 0,
  },
  noir: {
    brightness: 0.85,
    contrast: 1.3,
    saturate: 0,
    sepia: 0,
    hueRotate: 0,
  },
  midnight: {
    brightness: 0.8,
    contrast: 1.2,
    saturate: 0.7,
    sepia: 0,
    hueRotate: 15,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildFilterString(values: FilterValues): string {
  const parts: string[] = [];
  if (values.brightness !== 1) {
    parts.push(`brightness(${values.brightness})`);
  }
  if (values.contrast !== 1) {
    parts.push(`contrast(${values.contrast})`);
  }
  if (values.saturate !== 1) {
    parts.push(`saturate(${values.saturate})`);
  }
  if (values.sepia !== 0) {
    parts.push(`sepia(${values.sepia})`);
  }
  if (values.hueRotate !== 0) {
    parts.push(`hue-rotate(${values.hueRotate}deg)`);
  }
  return parts.length > 0 ? parts.join(" ") : "none";
}

export const ColorGrade: React.FC<ColorGradeProps> = ({
  preset,
  intensity = 1,
  children,
}) => {
  const target = PRESETS[preset];

  const mixed: FilterValues = {
    brightness: lerp(IDENTITY.brightness, target.brightness, intensity),
    contrast: lerp(IDENTITY.contrast, target.contrast, intensity),
    saturate: lerp(IDENTITY.saturate, target.saturate, intensity),
    sepia: lerp(IDENTITY.sepia, target.sepia, intensity),
    hueRotate: lerp(IDENTITY.hueRotate, target.hueRotate, intensity),
  };

  return (
    <AbsoluteFill style={{ filter: buildFilterString(mixed) }}>
      {children}
    </AbsoluteFill>
  );
};
