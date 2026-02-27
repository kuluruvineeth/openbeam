import { History } from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import type { SyncHistoryEntry } from "../lib/sync-types";
import { SyncHistoryItem } from "./sync-history-item";

type SyncHistoryPage = {
  history: SyncHistoryEntry[];
  nextCursor?: number | null;
};

type SyncHistoryListProps = {
  pages: SyncHistoryPage[] | undefined;
  isLoading: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

function HistorySkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 4 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonType} />
          <View style={styles.skeletonTime} />
          <View style={styles.skeletonSpacer} />
          <View style={styles.skeletonDuration} />
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <History color="#9ca3af" size={18} strokeWidth={2} />
      </View>
      <Text style={styles.emptyTitle}>No syncs yet</Text>
      <Text muted style={styles.emptySubtitle}>
        History appears after the first sync
      </Text>
    </View>
  );
}

export function SyncHistoryList({
  pages,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: SyncHistoryListProps) {
  const history = pages?.flatMap((p) => p.history) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: SyncHistoryEntry }) => <SyncHistoryItem entry={item} />,
    []
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) {
      return null;
    }
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color="#9ca3af" size="small" />
      </View>
    );
  }, [isFetchingNextPage]);

  if (isLoading) {
    return <HistorySkeleton />;
  }
  if (!history.length) {
    return <EmptyState />;
  }

  return (
    <View style={styles.listContainer}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        renderItem={renderItem}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  listContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  skeletonContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 10,
  },
  skeletonBadge: {
    width: 56,
    height: 20,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  skeletonType: {
    width: 48,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  skeletonTime: {
    width: 64,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  skeletonSpacer: {
    flex: 1,
  },
  skeletonDuration: {
    width: 40,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[16],
    gap: theme.spacing[2],
  },
  emptyIconContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    marginBottom: theme.spacing[1],
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foreground,
    opacity: 0.7,
  },
  emptySubtitle: {
    fontSize: 12,
  },
  loadingFooter: {
    paddingVertical: theme.spacing[3],
    alignItems: "center",
  },
}));
