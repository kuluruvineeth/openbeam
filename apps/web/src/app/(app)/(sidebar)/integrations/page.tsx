import type { Metadata } from "next";
import { Suspense } from "react";
import { Integrations } from "@/components/integrations/integrations";
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
        <Suspense fallback={<AppsSkeleton />}>
          <Integrations />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
