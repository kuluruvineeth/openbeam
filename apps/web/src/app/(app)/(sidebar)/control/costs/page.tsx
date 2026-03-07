import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { CostsSkeleton, CostsView } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Costs | Control Plane",
  description: "Agent cost analytics and budget tracking",
};

export default async function CostsPage() {
  batchPrefetch([
    trpc.control.costs.summary.queryOptions(),
    trpc.control.costs.byAgent.queryOptions(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<CostsSkeleton />}>
          <CostsView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
