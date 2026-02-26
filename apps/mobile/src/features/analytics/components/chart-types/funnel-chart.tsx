import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  coerceNumericData,
  formatChartLabel,
  formatChartValue,
  resolveColors,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData } from "../../types";
import { ChartEmpty } from "../chart-empty";

type FunnelChartProps = {
  data: ChartData;
  config: ChartConfig;
  compact?: boolean;
};

export function FunnelChartView({ data, config, compact }: FunnelChartProps) {
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

  const values = processed.map((row) => {
    const v = row[valueKey];
    return typeof v === "number" ? v : 0;
  });
  const maxValue = Math.max(...values, 1);

  return (
    <View style={[styles.container, { minHeight: height }]}>
      {processed.map((row, index) => {
        const value = values[index];
        const widthPercent = (value / maxValue) * 100;
        const label = formatChartLabel(row[nameKey]);
        const conversionRate =
          index > 0 && values[index - 1] > 0
            ? ((value / values[index - 1]) * 100).toFixed(0)
            : null;

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
          <View key={`funnel-${index}`} style={styles.funnelRow}>
            <View style={styles.funnelLabelCol}>
              <Text
                numberOfLines={1}
                style={[styles.funnelLabel, { color: theme.colors.foreground }]}
              >
                {label}
              </Text>
              {conversionRate && (
                <Text
                  style={[
                    styles.conversionText,
                    { color: theme.colors.mutedForeground },
                  ]}
                >
                  {conversionRate}%
                </Text>
              )}
            </View>
            <View style={styles.funnelBarContainer}>
              <View
                style={[
                  styles.funnelBar,
                  {
                    width: `${widthPercent}%`,
                    backgroundColor: colors[index],
                  },
                ]}
              >
                <Text style={styles.funnelBarText}>
                  {formatChartValue(value)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[2],
    justifyContent: "center",
  },
  funnelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  funnelLabelCol: {
    width: 72,
    gap: 2,
  },
  funnelLabel: {
    fontSize: 11,
  },
  conversionText: {
    fontSize: 9,
  },
  funnelBarContainer: {
    flex: 1,
    alignItems: "center",
  },
  funnelBar: {
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
  },
  funnelBarText: {
    fontSize: 10,
    color: "#ffffff",
  },
}));
