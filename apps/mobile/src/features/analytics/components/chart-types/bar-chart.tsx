import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  coerceNumericData,
  formatChartLabel,
  formatChartValue,
  resolveColors,
  resolveXKey,
  resolveYKeys,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData } from "../../types";
import { ChartEmpty } from "../chart-empty";

type BarChartProps = {
  data: ChartData;
  config: ChartConfig;
  compact?: boolean;
};

export function BarChartView({ data, config, compact }: BarChartProps) {
  const { theme } = useUnistyles();
  const processed = coerceNumericData(data, config);

  if (processed.length === 0) {
    return <ChartEmpty compact={compact} />;
  }

  const xKey = resolveXKey(processed, config);
  const yKeys = resolveYKeys(processed, config);
  const primaryYKey = yKeys[0];
  const colors = resolveColors(config, yKeys.length);

  if (!primaryYKey) {
    return <ChartEmpty compact={compact} />;
  }

  const values = processed.map((row) => {
    const v = row[primaryYKey];
    return typeof v === "number" ? v : 0;
  });
  const maxValue = Math.max(...values, 1);
  const height = config.height ?? (compact ? 160 : 240);

  return (
    <View style={[styles.container, { height }]}>
      {config.showLegend !== false && yKeys.length > 1 && (
        <View style={styles.legend}>
          {yKeys.map((key, i) => (
            <View key={key} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors[i] }]}
              />
              <Text
                style={[
                  styles.legendText,
                  { color: theme.colors.mutedForeground },
                ]}
              >
                {key}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.barsContainer}>
        {processed.map((row, index) => {
          const label = formatChartLabel(row[xKey]);
          const value = values[index];
          const widthPercent = (value / maxValue) * 100;

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
            <View key={`bar-${index}`} style={styles.barRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.barLabel,
                  { color: theme.colors.mutedForeground },
                ]}
              >
                {label}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${widthPercent}%`,
                      backgroundColor: colors[0],
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.barValue,
                  { color: theme.colors.mutedForeground },
                ]}
              >
                {formatChartValue(value)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[2],
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[3],
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
  },
  barsContainer: {
    flex: 1,
    gap: theme.spacing[2],
    justifyContent: "center",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  barLabel: {
    fontSize: 10,
    width: 56,
  },
  barTrack: {
    flex: 1,
    height: 20,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  barValue: {
    fontSize: 10,
    width: 40,
    textAlign: "right",
  },
}));
