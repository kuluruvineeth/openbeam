import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { DataSourcesHeader } from "@/components/data-sources/data-sources-header";
import {
  DataSourcesHeaderSkeleton,
  DataSourcesTableSkeleton,
} from "@/components/data-sources/data-sources-skeleton";
import { DataSourcesTable } from "@/components/data-sources/data-sources-table";
import { ErrorFallback } from "@/components/error-fallback";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Data Sources | OpenPlane",
  description: "Manage your data sources and sync operations",
};

export default async function DataSourcesPage() {
  batchPrefetch([trpc.apps.list.queryOptions()]);

  return (
    <HydrateClient>
      <div className="container mx-auto py-8">
        <Suspense fallback={<DataSourcesHeaderSkeleton />}>
          <DataSourcesHeader />
        </Suspense>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<DataSourcesTableSkeleton />}>
            <DataSourcesTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
