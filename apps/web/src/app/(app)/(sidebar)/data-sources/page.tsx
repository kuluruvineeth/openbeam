import type { Metadata } from "next";
import { Suspense } from "react";
import { DataSourcesHeader } from "@/components/data-sources/data-sources-header";
import {
  DataSourcesHeaderSkeleton,
  DataSourcesTableSkeleton,
} from "@/components/data-sources/data-sources-skeleton";
import { DataSourcesTable } from "@/components/data-sources/data-sources-table";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Data Sources | OpenPlane",
  description: "Manage your data sources and sync operations",
};

export default function DataSourcesPage() {
  return (
    <HydrateClient>
      <div className="container mx-auto py-8">
        <Suspense fallback={<DataSourcesHeaderSkeleton />}>
          <DataSourcesHeader />
        </Suspense>
        <Suspense fallback={<DataSourcesTableSkeleton />}>
          <DataSourcesTable />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
