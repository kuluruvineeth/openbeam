"use client";

import { SyncHistoryList } from "@/components/sync/sync-history-list";
import { useConnectorSyncHistory } from "@/hooks/use-connector";

type ConnectorSyncHistoryTabProps = {
  connectorId: string;
};

export function ConnectorSyncHistoryTab({
  connectorId,
}: ConnectorSyncHistoryTabProps) {
  const {
    data: syncHistory,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConnectorSyncHistory(connectorId, { limit: 20 });

  return (
    <SyncHistoryList
      data={syncHistory}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage ?? false}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={isLoading}
    />
  );
}
