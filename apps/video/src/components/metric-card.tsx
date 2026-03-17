import type React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  startFrame: number;
  sparkData?: number[];
  style?: React.CSSProperties;
}

const CARD_WIDTH = 260;
const SPARK_HEIGHT = 32;
const SPARK_PADDING = 16;

const CHANGE_COLORS: Record<string, string> = {
  positive: BRAND.green,
  negative: "#ef4444",
  neutral: BRAND.fgMuted,
};

const PARSE_NUMERIC_REGEX = /^([^0-9.-]*)([0-9]+\.?[0-9]*)(.*)$/;

function parseNumericValue(value: string): {
  prefix: string;
  number: number;
  suffix: string;
  decimals: number;
} {
  const match = value.match(PARSE_NUMERIC_REGEX);
  if (!match) {
    return { prefix: "", number: 0, suffix: value, decimals: 0 };
  }

  const numStr = match[2];
  const dotIndex = numStr.indexOf(".");
  const decimals = dotIndex >= 0 ? numStr.length - dotIndex - 1 : 0;

  return {
    prefix: match[1],
    number: Number.parseFloat(numStr),
    suffix: match[3],
    decimals,
  };
}

function buildSparklinePath(
  data: number[],
  width: number,
  height: number
): string {
  if (data.length < 2) {
    return "";
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  return data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  changeType = "neutral",
  startFrame,
  sparkData,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardProgress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 24, stiffness: 160, mass: 0.6 },
  });

  const cardOpacity = interpolate(cardProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(cardProgress, [0, 1], [16, 0]);

  const { prefix, number, suffix, decimals } = parseNumericValue(value);
  const countDuration = 40;
  const countProgress = interpolate(
    frame,
    [startFrame + 8, startFrame + 8 + countDuration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const currentNumber = countProgress * number;
  const displayNumber =
    decimals > 0
      ? currentNumber.toFixed(decimals)
      : Math.round(currentNumber).toLocaleString();

  const changeColor = CHANGE_COLORS[changeType];
  const sparkWidth = CARD_WIDTH - SPARK_PADDING * 2;

  return (
    <div
      style={{
        width: CARD_WIDTH,
        borderRadius: 6,
        border: `1px solid ${BRAND.border}`,
        background: BRAND.card,
        padding: 20,
        opacity: cardOpacity,
        transform: `translateY(${cardY}px)`,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          color: BRAND.fgMuted,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: sparkData ? 12 : 0,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 36,
            fontWeight: 600,
            color: BRAND.fg,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {prefix}
          {displayNumber}
          {suffix}
        </div>

        {change && (
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 14,
              color: changeColor,
            }}
          >
            {change}
          </div>
        )}
      </div>

      {sparkData && sparkData.length >= 2 && (
        // biome-ignore lint/a11y/noSvgWithoutTitle: decorative
        <svg
          height={SPARK_HEIGHT}
          style={{ display: "block" }}
          viewBox={`0 0 ${sparkWidth} ${SPARK_HEIGHT}`}
          width={sparkWidth}
        >
          <path
            d={buildSparklinePath(sparkData, sparkWidth, SPARK_HEIGHT)}
            fill="none"
            opacity={0.7}
            stroke={BRAND.blue}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      )}
    </div>
  );
};
