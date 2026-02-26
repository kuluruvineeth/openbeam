import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { COMPACT_CHART_HEIGHT, DEFAULT_CHART_HEIGHT } from "../constants";

type ChartEmptyProps = {
  compact?: boolean;
  state?: "empty" | "loading" | "error";
  message?: string;
};

export function ChartEmpty({
  compact,
  state = "empty",
  message,
}: ChartEmptyProps) {
  const { theme } = useUnistyles();
  const height = compact ? COMPACT_CHART_HEIGHT : DEFAULT_CHART_HEIGHT;

  return (
    <View
      style={[
        styles.container,
        { height },
        state === "error" && styles.errorBorder,
      ]}
    >
      {state === "loading" && (
        <ActivityIndicator color={theme.colors.mutedForeground} size="small" />
      )}
      {state === "error" && (
        <Text style={styles.errorText}>
          {message ?? "Failed to load chart"}
        </Text>
      )}
      {state === "empty" && (
        <Text
          style={[styles.emptyText, { color: theme.colors.mutedForeground }]}
        >
          {message ?? "No data"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  errorBorder: {
    borderColor: "#dc262666",
  },
  errorText: {
    fontSize: 11,
    color: "#dc2626",
  },
  emptyText: {
    fontSize: 11,
  },
}));
