import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "All Chats | OpenPlane",
  description: "View all your chat conversations",
};

export default function AllChatsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">All Chats</h1>
          <p className="text-muted-foreground">
            All your conversations will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
