import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Shared With Me | OpenPlane",
  description: "View agents shared with you",
};

export default function SharedAgentsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Shared With Me</h1>
          <p className="text-muted-foreground">
            Agents shared with you will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
