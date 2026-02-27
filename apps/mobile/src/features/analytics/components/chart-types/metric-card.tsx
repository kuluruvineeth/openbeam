import { Minus, TrendingDown, TrendingUp } from "lucide-react-native";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  calculateTrendPercent,
  formatChartValue,
  formatCurrency,
  formatPercent,
} from "../../lib/chart-utils";
import type { MetricConfig, MetricTrend } from "../../types";

type MetricCardProps = {
  config: MetricConfig;
};

function formatMetricValue(
  value: number | string,
  format?: MetricConfig["format"]
): string {
  if (typeof value === "string") {
    return value;
  }
  if (format === "currency") {
    return formatCurrency(value);
  }
  if (format === "percent") {
    return formatPercent(value);
  }
  return formatChartValue(value);
}

function deriveTrend(config: MetricConfig): MetricTrend {
  if (typeof config.value !== "number" || config.previousValue === undefined) {
    return "neutral";
  }
  if (config.value > config.previousValue) {
    return "up";
  }
  if (config.value < config.previousValue) {
    return "down";
  }
  return "neutral";
}

const TREND_COLORS: Record<MetricTrend, string> = {
  up: "#16a34a",
  down: "#dc2626",
  neutral: "#6b7280",
};

export function MetricCard({ config }: MetricCardProps) {
  const { theme } = useUnistyles();
  const formattedValue = formatMetricValue(config.value, config.format);
  const trend: MetricTrend = config.trend ?? deriveTrend(config);
  const trendColor = TREND_COLORS[trend];

  const trendPercent =
    typeof config.value === "number" && config.previousValue !== undefined
      ? calculateTrendPercent(config.value, config.previousValue)
      : null;

  const TrendIcon =
    // biome-ignore lint/style/noNestedTernary: readable inline conditional
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.mutedForeground }]}>
        {config.title}
      </Text>
      <Text style={styles.value}>{formattedValue}</Text>
      {(trendPercent !== null || config.trendLabel) && (
        <View style={styles.trendRow}>
          <TrendIcon color={trendColor} size={12} strokeWidth={2} />
          {trendPercent !== null && (
            <Text style={[styles.trendText, { color: trendColor }]}>
              {trendPercent > 0 ? "+" : ""}
              {trendPercent.toFixed(1)}%
            </Text>
          )}
          {config.trendLabel && (
            <Text
              style={[
                styles.trendLabel,
                { color: theme.colors.mutedForeground },
              ]}
            >
              {config.trendLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[1],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing[4],
  },
  title: {
    fontSize: 11,
  },
  value: {
    fontSize: 24,
    color: theme.colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  trendText: {
    fontSize: 11,
    fontWeight: "500",
  },
  trendLabel: {
    fontSize: 11,
  },
}));
