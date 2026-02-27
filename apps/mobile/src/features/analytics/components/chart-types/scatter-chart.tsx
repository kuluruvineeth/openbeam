import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  coerceNumericData,
  formatChartValue,
  resolveColors,
  resolveXKey,
  resolveYKeys,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData } from "../../types";
import { ChartEmpty } from "../chart-empty";

type ScatterChartProps = {
  data: ChartData;
  config: ChartConfig;
  compact?: boolean;
};

export function ScatterChartView({ data, config, compact }: ScatterChartProps) {
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

  const xValues = processed.map((row) => {
    const v = row[xKey];
    return typeof v === "number" ? v : 0;
  });
  const yValues = processed.map((row) => {
    const v = row[primaryYKey];
    return typeof v === "number" ? v : 0;
  });

  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const height = config.height ?? (compact ? 160 : 240);
  const chartHeight = height - 30;

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

      <View style={[styles.plotArea, { height: chartHeight }]}>
        {config.showGrid !== false &&
          Array.from({ length: 4 }, (_, i) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
              key={`grid-h-${i}`}
              style={[styles.gridLine, { top: (i / 3) * chartHeight }]}
            />
          ))}

        {processed.map((_, index) => {
          const xNorm = (xValues[index] - xMin) / xRange;
          const yNorm = (yValues[index] - yMin) / yRange;

          return (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
              key={`dot-${index}`}
              style={[
                styles.scatterDot,
                {
                  left: `${xNorm * 90 + 5}%`,
                  bottom: yNorm * (chartHeight - 16),
                  backgroundColor: colors[0],
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.axisRow}>
        <Text
          style={[styles.axisText, { color: theme.colors.mutedForeground }]}
        >
          {formatChartValue(xMin)}
        </Text>
        <Text
          style={[styles.axisLabel, { color: theme.colors.mutedForeground }]}
        >
          {xKey}
        </Text>
        <Text
          style={[styles.axisText, { color: theme.colors.mutedForeground }]}
        >
          {formatChartValue(xMax)}
        </Text>
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
  plotArea: {
    flex: 1,
    position: "relative",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  scatterDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  axisText: {
    fontSize: 9,
  },
  axisLabel: {
    fontSize: 9,
  },
}));
