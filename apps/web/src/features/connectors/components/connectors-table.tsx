"use client";

import { Skeleton } from "@openbeam/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useConnectors } from "@/features/connectors/hooks";
import { ConnectorsEmptyState } from "./connectors-empty-state";
import { UnifiedConnectorsTable } from "./unified-connectors-table";

function ConnectorsTableContent() {
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

function ConnectorsTableFallback() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton className="h-12 w-full" key={`table-fallback-${i}`} />
      ))}
    </div>
  );
}

export function ConnectorsTable() {
  return (
    <Suspense fallback={<ConnectorsTableFallback />}>
      <ConnectorsTableContent />
    </Suspense>
  );
}
