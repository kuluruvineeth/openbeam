import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import {
  SyncControls,
  SyncHistoryList,
  SyncStatusCard,
  type SyncStatusType,
  useSyncHistoryInfinite,
  useSyncStatus,
} from "@/features/sync";

type ConnectorSyncHistoryTabProps = {
  connectorId: string;
};

export function ConnectorSyncHistoryTab({
  connectorId,
}: ConnectorSyncHistoryTabProps) {
  const { data: syncStatus } = useSyncStatus(connectorId);
  const {
    data: historyData,
    isLoading: historyLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSyncHistoryInfinite(connectorId, { limit: 20 });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.container}
    >
      <SyncStatusCard
        connectorId={connectorId}
        syncStatus={syncStatus as SyncStatusType | undefined}
      />
      <SyncControls
        connectorId={connectorId}
        syncStatus={syncStatus as SyncStatusType | undefined}
      />
      <View style={styles.historySection}>
        <SyncHistoryList
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={historyLoading}
          pages={
            historyData?.pages as Parameters<typeof SyncHistoryList>[0]["pages"]
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[4],
    gap: theme.spacing[6],
    paddingBottom: theme.spacing[8],
  },
  historySection: {
    gap: theme.spacing[3],
  },
}));
