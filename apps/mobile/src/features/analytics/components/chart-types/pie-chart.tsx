import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  coerceNumericData,
  formatChartLabel,
  formatChartValue,
  resolveColors,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData, ChartType } from "../../types";
import { ChartEmpty } from "../chart-empty";

type PieChartProps = {
  data: ChartData;
  config: ChartConfig;
  type?: Extract<ChartType, "pie" | "donut">;
  compact?: boolean;
};

export function PieChartView({
  data,
  config,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: required by callback signature
  type = "pie",
  compact,
}: PieChartProps) {
  const { theme } = useUnistyles();
  const processed = coerceNumericData(data, config);

  if (processed.length === 0) {
    return <ChartEmpty compact={compact} />;
  }

  const nameKey =
    config.nameKey ?? Object.keys(processed[0] ?? {})[0] ?? "name";
  const valueKey =
    config.valueKey ?? Object.keys(processed[0] ?? {})[1] ?? "value";
  const colors = resolveColors(config, processed.length);
  const height = config.height ?? (compact ? 160 : 240);

  const total = processed.reduce((sum, row) => {
    const v = row[valueKey];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);

  return (
    <View style={[styles.container, { minHeight: height }]}>
      <View style={styles.segments}>
        {processed.map((row, index) => {
          const value =
            typeof row[valueKey] === "number" ? (row[valueKey] as number) : 0;
          const percent = total > 0 ? (value / total) * 100 : 0;
          const label = formatChartLabel(row[nameKey]);

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
            <View key={`segment-${index}`} style={styles.segmentRow}>
              <View
                style={[
                  styles.segmentColor,
                  { backgroundColor: colors[index] },
                ]}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.segmentLabel,
                  { color: theme.colors.foreground },
                ]}
              >
                {label}
              </Text>
              <View style={styles.segmentBarTrack}>
                <View
                  style={[
                    styles.segmentBarFill,
                    {
                      width: `${percent}%`,
                      backgroundColor: colors[index],
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.segmentValue,
                  { color: theme.colors.mutedForeground },
                ]}
              >
                {formatChartValue(value)}
              </Text>
              <Text
                style={[
                  styles.segmentPercent,
                  { color: theme.colors.mutedForeground },
                ]}
              >
                {percent.toFixed(0)}%
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.totalRow}>
        <Text
          style={[styles.totalLabel, { color: theme.colors.mutedForeground }]}
        >
          Total
        </Text>
        <Text style={styles.totalValue}>{formatChartValue(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[3],
  },
  segments: {
    gap: theme.spacing[2],
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  segmentColor: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  segmentLabel: {
    fontSize: 11,
    width: 72,
  },
  segmentBarTrack: {
    flex: 1,
    height: 14,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
    overflow: "hidden",
  },
  segmentBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  segmentValue: {
    fontSize: 10,
    width: 40,
    textAlign: "right",
  },
  segmentPercent: {
    fontSize: 10,
    width: 30,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: theme.spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 11,
  },
  totalValue: {
    fontSize: 11,
    color: theme.colors.foreground,
  },
}));
