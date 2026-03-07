import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { notFound } from "next/navigation";
import { ErrorFallback } from "@/components/error-fallback";
import { AgenticView } from "@/features/agents";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AgentPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Agent ${id} | OpenBeam`,
    description: "View and interact with your AI agent",
  };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  batchPrefetch([
    trpc.agentCanvas.get.queryOptions({ canvasId: id }),
    trpc.agentCanvas.listExecutions.queryOptions({ canvasId: id }),
    trpc.agentCanvas.listTools.queryOptions(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <AgenticView agentId={id} />
      </ErrorBoundary>
    </HydrateClient>
  );
}
