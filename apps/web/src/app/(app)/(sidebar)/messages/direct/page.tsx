import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Direct Messages | OpenPlane",
  description: "View your direct messages",
};

export default function DirectMessagesPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Direct Messages</h1>
          <p className="text-muted-foreground">
            Your direct messages will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
