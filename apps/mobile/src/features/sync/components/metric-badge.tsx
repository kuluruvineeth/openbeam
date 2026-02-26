import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";

type MetricColor = "green" | "blue" | "red" | "orange" | "purple";

type MetricBadgeProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: MetricColor;
  compact?: boolean;
};

const COLOR_MAP: Record<
  MetricColor,
  { border: string; bg: string; text: string }
> = {
  green: {
    border: "rgba(22, 163, 74, 0.2)",
    bg: "rgba(22, 163, 74, 0.05)",
    text: "#16a34a",
  },
  blue: {
    border: "rgba(37, 99, 235, 0.2)",
    bg: "rgba(37, 99, 235, 0.05)",
    text: "#2563eb",
  },
  red: {
    border: "rgba(220, 38, 38, 0.2)",
    bg: "rgba(220, 38, 38, 0.05)",
    text: "#dc2626",
  },
  orange: {
    border: "rgba(249, 115, 22, 0.2)",
    bg: "rgba(249, 115, 22, 0.05)",
    text: "#f97316",
  },
  purple: {
    border: "rgba(147, 51, 234, 0.2)",
    bg: "rgba(147, 51, 234, 0.05)",
    text: "#9333ea",
  },
};

export function MetricBadge({
  label,
  value,
  icon: Icon,
  color,
  compact,
}: MetricBadgeProps) {
  const colors = COLOR_MAP[color];

  return (
    <View
      style={[
        compact ? styles.containerCompact : styles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <View style={styles.iconRow}>
        <Icon color={colors.text} size={12} strokeWidth={2} />
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: colors.text }]}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    gap: theme.spacing[1],
    borderWidth: 1,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 6,
    borderRadius: 6,
  },
  containerCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    borderWidth: 1,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 6,
    borderRadius: 6,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
}));
