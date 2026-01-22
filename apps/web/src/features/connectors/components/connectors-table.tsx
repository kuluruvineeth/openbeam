"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useConnectors } from "@/features/connectors/hooks";
import { ConnectorsEmptyState } from "./connectors-empty-state";
import { UnifiedConnectorsTable } from "./unified-connectors-table";

export function ConnectorsTable() {
  const { data: connectors, isLoading } = useConnectors();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("q") ?? undefined;

  return (
    <UnifiedConnectorsTable
      columnLabel="Connector"
      connectors={connectors ?? undefined}
      emptyState={<ConnectorsEmptyState />}
      isLoading={isLoading}
      onClearSearch={() => router.push("/connectors")}
      onRowClick={(connector) => router.push(`/connectors/${connector.id}`)}
      searchQuery={search}
    />
  );
}
