import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import {
  ConnectorsContent,
  ConnectorsHeader,
  ConnectorsPageSkeleton,
} from "@/features/connectors/components";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Connectors | OpenPlane",
  description: "Manage your connectors and data sources",
};

export default async function ConnectorsPage() {
  batchPrefetch([trpc.apps.list.queryOptions(), trpc.user.me.queryOptions()]);

  return (
    <HydrateClient>
      <div className="mt-4">
        <ConnectorsHeader />
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<ConnectorsPageSkeleton />}>
            <ConnectorsContent />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
