import type { Metadata } from "next";
import { NewChatView } from "@/components/new-chat-view";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "New Chat | OpenPlane",
  description: "Start a new chat conversation",
};

export default function NewChatPage() {
  return (
    <HydrateClient>
      <NewChatView />
    </HydrateClient>
  );
}
