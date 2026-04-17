import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { ComputerDetailView } from "@/features/computer";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Agent Details | OpenBeam",
  description: "View agent runs, memory, and configuration",
};

export default async function ComputerAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  batchPrefetch([
    trpc.computer.getAgent.queryOptions({ agentId }),
    trpc.computer.listRuns.queryOptions({ agentId, limit: 20 }),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense
          fallback={
            <div className="mx-auto max-w-4xl py-8">
              <div className="h-96 animate-pulse rounded-md bg-muted" />
            </div>
          }
        >
          <ComputerDetailView agentId={agentId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
