import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "New Chat | OpenPlane",
  description: "Start a new chat conversation",
};

export default function NewChatPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">New Chat</h1>
          <p className="text-muted-foreground">Start a new conversation</p>
        </div>
      </div>
    </HydrateClient>
  );
}
