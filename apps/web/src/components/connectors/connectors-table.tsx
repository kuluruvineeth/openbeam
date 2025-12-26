"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ConnectorsEmptyState } from "@/components/connectors/connectors-empty-state";
import { UnifiedConnectorsTable } from "@/components/connectors/unified-connectors-table";
import { useConnectors } from "@/hooks/use-connectors";

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
