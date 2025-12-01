"use client";

import { SyncHistoryList } from "@/components/sync/sync-history-list";
import { useConnectorSyncHistory } from "@/hooks/use-connector";

export function ConnectorSyncHistoryTab({
  connectorId,
}: {
  connectorId: string;
}) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConnectorSyncHistory(connectorId, { limit: 20 });

  return (
    <SyncHistoryList
      data={data}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage ?? false}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={isLoading}
    />
  );
}
