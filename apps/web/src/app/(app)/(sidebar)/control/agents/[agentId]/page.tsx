import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { AgentDetailSkeleton, AgentDetailView } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{ agentId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agentId } = await params;
  return {
    title: `Agent ${agentId} | Control Plane | OpenBeam`,
  };
}

export default async function AgentDetailPage({ params }: Props) {
  const { agentId } = await params;

  batchPrefetch([
    trpc.control.agents.get.queryOptions({ agentId }),
    trpc.control.agents.getWithRelations.queryOptions({ agentId }),
    trpc.control.heartbeats.listRuns.queryOptions({ agentId }),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<AgentDetailSkeleton />}>
          <AgentDetailView agentId={agentId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
