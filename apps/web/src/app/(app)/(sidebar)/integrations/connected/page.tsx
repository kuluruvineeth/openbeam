import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Connected Integrations | OpenPlane",
  description: "View your connected integrations",
};

export default function ConnectedIntegrationsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Connected Integrations</h1>
          <p className="text-muted-foreground">
            Your connected integrations will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
