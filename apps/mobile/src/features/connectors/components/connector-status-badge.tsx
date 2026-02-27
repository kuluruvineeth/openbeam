import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { CONNECTOR_STATUS_COLORS, CONNECTOR_STATUS_LABELS } from "../constants";

type ConnectorStatusBadgeProps = {
  status: string;
};

export function ConnectorStatusBadge({ status }: ConnectorStatusBadgeProps) {
  const colors = CONNECTOR_STATUS_COLORS[status] ?? {
    bg: "#f3f4f6",
    text: "#6b7280",
  };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Text style={[styles.label, { color: colors.text }]}>
        {CONNECTOR_STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
}));
