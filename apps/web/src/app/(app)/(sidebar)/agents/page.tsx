import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { AgentsListView, AgentsPageSkeleton } from "@/features/agents";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Agents | OpenBeam",
  description: "Manage your AI agents and workflows",
};

export default async function AgentsPage() {
  batchPrefetch([
    trpc.user.me.queryOptions(),
    trpc.agentCanvas.list.queryOptions({ limit: 12 }),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<AgentsPageSkeleton />}>
          <AgentsListView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
