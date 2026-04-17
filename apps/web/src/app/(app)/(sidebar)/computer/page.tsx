import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { ComputerListView, ComputerPageSkeleton } from "@/features/computer";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Computer | OpenBeam",
  description: "Autonomous agents that work for your team",
};

export default async function ComputerPage() {
  batchPrefetch([trpc.computer.listAgents.queryOptions()]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ComputerPageSkeleton />}>
          <ComputerListView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
