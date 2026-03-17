import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/fonts";
import { BRAND } from "../lib/theme";

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  startFrame: number;
  staggerFrames?: number;
  direction?: "horizontal" | "vertical";
  barHeight?: number;
  maxWidth?: number;
  showLabels?: boolean;
  showValues?: boolean;
  valueFormat?: (v: number) => string;
  style?: React.CSSProperties;
}

export const AnimatedBarChart: React.FC<BarChartProps> = ({
  data,
  startFrame,
  staggerFrames = 6,
  direction = "horizontal",
  barHeight = 32,
  maxWidth = 600,
  showLabels = true,
  showValues = true,
  valueFormat = (v) => String(v),
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const gap = 12;

  if (direction === "vertical") {
    const barWidth = Math.min(
      60,
      (maxWidth - gap * (data.length - 1)) / data.length
    );
    const chartHeight = barHeight * 8;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap,
          height: chartHeight,
          ...style,
        }}
      >
        {data.map((item, i) => {
          const barStart = startFrame + i * staggerFrames;
          const progress = spring({
            frame: frame - barStart,
            fps,
            config: { damping: 22, stiffness: 120, mass: 0.8 },
          });

          const height = (item.value / maxValue) * chartHeight * progress;
          const color = item.color ?? BRAND.blue;

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              {showValues && (
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 14,
                    color: BRAND.fgMuted,
                    opacity: interpolate(progress, [0, 0.5], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  {valueFormat(Math.round(item.value * progress))}
                </span>
              )}
              <div
                style={{
                  width: barWidth,
                  height,
                  backgroundColor: color,
                  borderRadius: `${BRAND.radius}px ${BRAND.radius}px 0 0`,
                }}
              />
              {showLabels && (
                <span
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 13,
                    color: BRAND.fgMuted,
                    textAlign: "center",
                    maxWidth: barWidth + 10,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        ...style,
      }}
    >
      {data.map((item, i) => {
        const barStart = startFrame + i * staggerFrames;
        const progress = spring({
          frame: frame - barStart,
          fps,
          config: { damping: 22, stiffness: 120, mass: 0.8 },
        });

        const width = (item.value / maxValue) * maxWidth * progress;
        const color = item.color ?? BRAND.blue;

        return (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {showLabels && (
              <span
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                  color: BRAND.fgMuted,
                  minWidth: 80,
                  textAlign: "right",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            )}
            <div
              style={{
                height: barHeight,
                width,
                backgroundColor: color,
                borderRadius: BRAND.radius,
              }}
            />
            {showValues && (
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 14,
                  color: BRAND.fgMuted,
                  opacity: interpolate(progress, [0, 0.5], [0, 1], {
                    extrapolateRight: "clamp",
                  }),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {valueFormat(Math.round(item.value * progress))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
