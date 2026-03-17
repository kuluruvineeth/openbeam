import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

interface AudioReactiveProps {
  frequency?: number;
  amplitude?: number;
  property?: "scale" | "opacity" | "blur" | "glow";
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const AudioReactive: React.FC<AudioReactiveProps> = ({
  frequency = 2,
  amplitude = 0.05,
  property = "scale",
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phase = (frame / fps) * frequency * Math.PI * 2;
  const wave = (Math.sin(phase) + 1) / 2;
  const value = wave * amplitude;

  const effectStyle = buildEffectStyle(property, value);

  return (
    <div
      style={{
        willChange: "transform, filter, opacity",
        ...effectStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

function buildEffectStyle(
  property: AudioReactiveProps["property"],
  value: number
): React.CSSProperties {
  switch (property) {
    case "scale":
      return { transform: `scale(${1 + value})` };
    case "opacity":
      return { opacity: 1 - value };
    case "blur":
      return { filter: `blur(${value * 20}px)` };
    case "glow": {
      const spread = value * 40;
      return {
        filter: `drop-shadow(0 0 ${spread}px rgba(255,255,255,${value * 4}))`,
      };
    }
    default:
      return {};
  }
}
