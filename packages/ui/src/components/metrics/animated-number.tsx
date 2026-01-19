"use client";

import NumberFlow from "@number-flow/react";

import { cn } from "../../utils/cn";

type NumberFormat = "number" | "currency" | "percent" | "compact";
type Trend = "up" | "down" | "neutral";

interface AnimatedNumberProps {
  value: number;
  format?: NumberFormat;
  locale?: string;
  currency?: string;
  decimals?: number;
  className?: string;
  trend?: Trend;
  prefix?: string;
  suffix?: string;
}

type FormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  style?: "currency" | "percent";
  currency?: string;
  notation?: "compact" | "standard";
};

function getFormatOptions(
  format: NumberFormat,
  currency: string,
  decimals?: number
): FormatOptions {
  const formatMap: Record<NumberFormat, FormatOptions> = {
    number: {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 0,
    },
    currency: {
      style: "currency",
      currency,
      minimumFractionDigits: decimals ?? 2,
    },
    percent: {
      style: "percent",
      minimumFractionDigits: decimals ?? 1,
    },
    compact: {
      notation: "compact",
      maximumFractionDigits: decimals ?? 1,
    },
  };
  return formatMap[format];
}

function AnimatedNumber({
  value,
  format = "number",
  locale = "en-US",
  currency = "USD",
  decimals,
  className,
  trend,
  prefix,
  suffix,
}: AnimatedNumberProps) {
  const formatOptions = getFormatOptions(format, currency, decimals);

  return (
    <span
      className={cn(
        "tabular-nums",
        trend === "up" && "text-emerald-500",
        trend === "down" && "text-red-500",
        className
      )}
    >
      {prefix}
      <NumberFlow
        format={formatOptions}
        locales={locale}
        opacityTiming={{ duration: 300, easing: "ease-out" }}
        spinTiming={{ duration: 500, easing: "ease-out" }}
        transformTiming={{ duration: 500, easing: "ease-out" }}
        value={value}
      />
      {suffix}
    </span>
  );
}

export { AnimatedNumber };
export type { AnimatedNumberProps, NumberFormat, Trend };
