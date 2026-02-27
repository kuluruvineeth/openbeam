import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { formatDocumentCount, formatSyncTime } from "../lib";
import type { Connector } from "../types";
import { ConnectorStatusBadge } from "./connector-status-badge";

type ConnectorRowProps = {
  connector: Connector;
  onPress?: (connector: Connector) => void;
};

export function ConnectorRow({ connector, onPress }: ConnectorRowProps) {
  const { theme } = useUnistyles();

  const totalIndexed = connector.syncStatus?.stats.totalIndexed ?? 0;

  return (
    <Pressable onPress={() => onPress?.(connector)} style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>
          {connector.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            numberOfLines={1}
            style={styles.name}
            variant="body"
            weight="medium"
          >
            {connector.name}
          </Text>
          <ConnectorStatusBadge status={connector.status} />
        </View>

        <View style={styles.meta}>
          <Text muted style={styles.metaText}>
            {formatSyncTime(connector.lastSyncedAt)}
          </Text>
          {totalIndexed > 0 && (
            <>
              <Text muted style={styles.dot}>
                ·
              </Text>
              <Text muted style={styles.metaText}>
                {formatDocumentCount(totalIndexed)} docs
              </Text>
            </>
          )}
        </View>
      </View>

      <ChevronRight
        color={theme.colors.mutedForeground}
        size={16}
        strokeWidth={1.5}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
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
  content: {
    flex: 1,
    gap: theme.spacing[1],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  name: {
    flex: 1,
    fontSize: 14,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  metaText: {
    fontSize: 11,
  },
  dot: {
    fontSize: 11,
  },
}));
