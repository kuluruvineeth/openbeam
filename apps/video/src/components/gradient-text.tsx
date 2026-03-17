import type React from "react";
import { useCurrentFrame } from "remotion";
import { FONTS } from "../lib/fonts";

interface GradientTextProps {
  text: string;
  colors: string[];
  angle?: number;
  speed?: number;
  fontSize?: number;
  fontFamily?: string;
  style?: React.CSSProperties;
}

export const GradientText: React.FC<GradientTextProps> = ({
  text,
  colors,
  angle = 90,
  speed = 3,
  fontSize = 64,
  fontFamily = FONTS.sans,
  style,
}) => {
  const frame = useCurrentFrame();
  const offset = frame * speed;

  const gradientColors =
    colors.length >= 2
      ? colors.join(", ")
      : `${colors[0] ?? "#fff"}, ${colors[0] ?? "#fff"}`;

  return (
    <div
      style={{
        fontSize,
        fontFamily,
        backgroundImage: `linear-gradient(${angle}deg, ${gradientColors})`,
        backgroundSize: "200% 200%",
        backgroundPosition: `${offset}% 50%`,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
