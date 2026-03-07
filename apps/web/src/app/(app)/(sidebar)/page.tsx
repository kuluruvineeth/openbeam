import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { NewChatView } from "@/features/chat/components/new-chat-view";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "New Chat | OpenBeam",
  description: "Start a new chat conversation",
};

export default async function NewChatPage() {
  batchPrefetch([trpc.user.me.queryOptions()]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <NewChatView />
      </ErrorBoundary>
    </HydrateClient>
  );
}
