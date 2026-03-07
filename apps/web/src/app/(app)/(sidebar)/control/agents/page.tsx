import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { AgentsListView, AgentsSkeleton } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Agents | Control Plane | OpenBeam",
  description: "Manage your AI agents",
};

export default async function ControlAgentsPage() {
  batchPrefetch([
    trpc.control.agents.list.queryOptions({}),
    trpc.control.agents.count.queryOptions({}),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<AgentsSkeleton />}>
          <AgentsListView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
