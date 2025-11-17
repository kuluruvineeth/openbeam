import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Channels | OpenPlane",
  description: "View your channel messages",
};

export default function ChannelsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Channels</h1>
          <p className="text-muted-foreground">
            Your channel messages will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
