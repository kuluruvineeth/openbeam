import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "All Agents | OpenPlane",
  description: "View all agents",
};

export default function AllAgentsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">All Agents</h1>
          <p className="text-muted-foreground">All agents will appear here</p>
        </div>
      </div>
    </HydrateClient>
  );
}
