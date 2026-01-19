import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { NewAgentView } from "@/components/agents/new-agent-view";
import { ErrorFallback } from "@/components/error-fallback";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "New Agent | OpenPlane",
  description: "Create a new AI agent",
};

export default async function NewAgentPage() {
  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <NewAgentView />
      </ErrorBoundary>
    </HydrateClient>
  );
}
