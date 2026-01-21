import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { AgentsListView } from "@/features/agents";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Agents | OpenPlane",
  description: "Manage your AI agents and workflows",
};

export default async function AgentsPage() {
  batchPrefetch([trpc.user.me.queryOptions()]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <AgentsListView />
      </ErrorBoundary>
    </HydrateClient>
  );
}
