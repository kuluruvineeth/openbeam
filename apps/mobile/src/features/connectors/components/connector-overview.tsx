import { RefreshCw } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useConnector, useConnectorSyncStatus } from "../hooks";
import {
  formatConnectorName,
  formatDocumentCount,
  formatSyncTime,
} from "../lib";
import { ConnectorStatusBadge } from "./connector-status-badge";
import { ConnectorOverviewSkeleton } from "./connectors-skeleton";

type ConnectorOverviewProps = {
  connectorId: string;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
};

export function ConnectorOverview({
  connectorId,
  onTriggerSync,
  isSyncing,
}: ConnectorOverviewProps) {
  const { theme } = useUnistyles();
  const { data: connector, isLoading: isLoadingConnector } =
    useConnector(connectorId);
  // biome-ignore lint/correctness/noUnusedVariables: destructured for side effect
  const { data: syncStatus, isLoading: isLoadingSyncStatus } =
    useConnectorSyncStatus(connectorId);

  if (isLoadingConnector || isLoadingSyncStatus) {
    return <ConnectorOverviewSkeleton />;
  }

  if (!connector) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>
            {connector.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerContent}>
          <Text numberOfLines={1} variant="body" weight="medium">
            {connector.name}
          </Text>
          <Text muted style={styles.appLabel}>
            {formatConnectorName(connector.app)}
          </Text>
        </View>

        {onTriggerSync && (
          <Pressable
            disabled={isSyncing}
            onPress={onTriggerSync}
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          >
            <RefreshCw
              color={theme.colors.foreground}
              size={12}
              strokeWidth={1.5}
            />
            <Text
              style={styles.syncButtonText}
              variant="caption"
              weight="medium"
            >
              Sync
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.statusRow}>
        <Text muted style={styles.statusLabel}>
          Status
        </Text>
        <ConnectorStatusBadge status={connector.status} />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text muted style={styles.statLabel}>
            Documents
          </Text>
          <Text style={styles.statValue} weight="medium">
            {formatDocumentCount(connector.totalDocuments)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text muted style={styles.statLabel}>
            Messages
          </Text>
          <Text style={styles.statValue} weight="medium">
            {formatDocumentCount(connector.totalMessages)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text muted style={styles.statLabel}>
            Files
          </Text>
          <Text style={styles.statValue} weight="medium">
            {formatDocumentCount(connector.totalFiles)}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text muted style={styles.metaLabel}>
          Last synced
        </Text>
        <Text style={styles.metaValue}>
          {formatSyncTime(connector.lastSyncedAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  appLabel: {
    fontSize: 11,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing[3],
  },
  statItem: {
    flex: 1,
    gap: theme.spacing[1],
  },
  statLabel: {
    fontSize: 10,
  },
  statValue: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontSize: 12,
  },
}));
