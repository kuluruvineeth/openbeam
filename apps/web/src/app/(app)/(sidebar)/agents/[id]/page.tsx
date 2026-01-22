import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { notFound } from "next/navigation";
import { ErrorFallback } from "@/components/error-fallback";
import { AgentCanvasView } from "@/features/agents";
import { HydrateClient } from "@/trpc/server";

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AgentPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Agent ${id} | OpenPlane`,
    description: "View and interact with your AI agent",
  };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <AgentCanvasView agentId={id} />
      </ErrorBoundary>
    </HydrateClient>
  );
}
