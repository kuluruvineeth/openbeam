"use client";

import { useConnectorSyncHistory } from "@/features/connectors/hooks";
import { SyncHistoryList } from "@/features/sync";

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
