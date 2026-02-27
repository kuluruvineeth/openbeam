import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import type { ConnectorTab } from "../types";

type ConnectorsTabsProps = {
  value: ConnectorTab;
  onChange: (tab: ConnectorTab) => void;
};

const TABS: { id: ConnectorTab; label: string }[] = [
  { id: "connected", label: "Connected" },
  { id: "available", label: "Available" },
];

export function ConnectorsTabs({ value, onChange }: ConnectorsTabsProps) {
  // biome-ignore lint/correctness/noUnusedVariables: destructured for side effect
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = value === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text
              style={isActive ? styles.tabTextActive : styles.tabText}
              variant="caption"
              weight={isActive ? "medium" : undefined}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  tab: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.muted,
  },
  tabText: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
  },
  tabTextActive: {
    color: theme.colors.foreground,
    fontSize: 13,
  },
}));
