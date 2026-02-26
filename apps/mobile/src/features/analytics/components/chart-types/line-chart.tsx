import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  coerceNumericData,
  formatChartLabel,
  resolveColors,
  resolveXKey,
  resolveYKeys,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData } from "../../types";
import { ChartEmpty } from "../chart-empty";

type LineChartProps = {
  data: ChartData;
  config: ChartConfig;
  compact?: boolean;
};

export function LineChartView({ data, config, compact }: LineChartProps) {
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
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const height = config.height ?? (compact ? 160 : 240);
  const chartHeight = height - 40;

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

      <View style={[styles.chartArea, { height: chartHeight }]}>
        {config.showGrid !== false &&
          Array.from({ length: 4 }, (_, i) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
              key={`grid-${i}`}
              style={[styles.gridLine, { top: (i / 3) * chartHeight }]}
            />
          ))}

        <View style={styles.dotsRow}>
          {values.map((value, index) => {
            const normalizedY = (value - minValue) / range;
            const bottomOffset = normalizedY * (chartHeight - 16);

            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
              <View key={`dot-${index}`} style={styles.dotColumn}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: colors[0],
                      bottom: bottomOffset,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.xLabels}>
        {processed.map((row, index) => {
          if (processed.length > 8 && index % 2 !== 0) {
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
            return <View key={`label-${index}`} style={styles.xLabelSlot} />;
          }
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
            <View key={`label-${index}`} style={styles.xLabelSlot}>
              <Text
                numberOfLines={1}
                style={[
                  styles.xLabelText,
                  { color: theme.colors.mutedForeground },
                ]}
              >
                {formatChartLabel(row[xKey])}
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
    gap: theme.spacing[1],
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
  chartArea: {
    flex: 1,
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  dotsRow: {
    flexDirection: "row",
    flex: 1,
    alignItems: "flex-end",
  },
  dotColumn: {
    flex: 1,
    alignItems: "center",
    position: "relative",
    height: "100%",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
  },
  xLabels: {
    flexDirection: "row",
  },
  xLabelSlot: {
    flex: 1,
    alignItems: "center",
  },
  xLabelText: {
    fontSize: 9,
  },
}));
