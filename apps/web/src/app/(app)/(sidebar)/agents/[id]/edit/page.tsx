import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { notFound } from "next/navigation";
import { ErrorFallback } from "@/components/error-fallback";
import { AgentEditorView } from "@/features/agents";
import { HydrateClient } from "@/trpc/server";

interface AgentEditPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AgentEditPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Edit Agent ${id} | OpenPlane`,
    description: "Edit your AI agent configuration",
  };
}

export default async function AgentEditPage({ params }: AgentEditPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <AgentEditorView agentId={id} />
      </ErrorBoundary>
    </HydrateClient>
  );
}
