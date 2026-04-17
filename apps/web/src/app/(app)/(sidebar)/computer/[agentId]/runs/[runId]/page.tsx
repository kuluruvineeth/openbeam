import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { ComputerRunView } from "@/features/computer";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Run Details | OpenBeam",
  description: "View agent run steps, proposals, and results",
};

export default async function ComputerRunPage({
  params,
}: {
  params: Promise<{ agentId: string; runId: string }>;
}) {
  const { agentId, runId } = await params;

  batchPrefetch([
    trpc.computer.getRun.queryOptions({ agentId, runId }),
    trpc.computer.getProposals.queryOptions({ agentId, runId }),
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
          <ComputerRunView agentId={agentId} runId={runId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
