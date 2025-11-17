import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "All Integrations | OpenPlane",
  description: "View all available integrations",
};

export default function AllIntegrationsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">All Integrations</h1>
          <p className="text-muted-foreground">
            All available integrations will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
