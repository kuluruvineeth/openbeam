import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useConnectorsStats } from "../hooks";
import type { ConnectorTab } from "../types";
import { ConnectorsTabs } from "./connectors-tabs";

type ConnectorsHeaderProps = {
  tab: ConnectorTab;
  onTabChange: (tab: ConnectorTab) => void;
};

function StatItem({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue} variant="caption" weight="medium">
        {value}
      </Text>
      <Text muted style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

export function ConnectorsHeader({ tab, onTabChange }: ConnectorsHeaderProps) {
  const { data: stats, isLoading } = useConnectorsStats();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text variant="title" weight="bold">
          Connectors
        </Text>
      </View>

      {!isLoading && stats.totalConnectors > 0 && (
        <View style={styles.statsRow}>
          <StatItem label="Connected" value={stats.totalConnectors} />
          <StatItem label="Active" value={stats.activeConnectors} />
          <StatItem
            label="Documents"
            value={stats.totalDocuments.toLocaleString()}
          />
        </View>
      )}

      <ConnectorsTabs onChange={onTabChange} value={tab} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[3],
    paddingTop: theme.spacing[4],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 11,
  },
}));
