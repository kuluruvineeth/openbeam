import type { Metadata } from "next";
import { IntegrationsHeader } from "@/components/integrations/integrations-header";
import { AppsSkeleton } from "@/components/integrations/integrations-skeleton";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Integrations | OpenPlane",
  description: "Manage your integrations",
};

export default function IntegrationsPage() {
  return (
    <HydrateClient>
      <div className="mt-4">
        <IntegrationsHeader />
        <AppsSkeleton />
      </div>
    </HydrateClient>
  );
}
