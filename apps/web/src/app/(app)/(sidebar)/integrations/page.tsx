import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { Integrations } from "@/components/integrations/integrations";
import { IntegrationsHeader } from "@/components/integrations/integrations-header";
import { AppsSkeleton } from "@/components/integrations/integrations-skeleton";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Integrations | OpenPlane",
  description: "Manage your integrations",
};

export default async function IntegrationsPage() {
  batchPrefetch([trpc.apps.list.queryOptions(), trpc.user.me.queryOptions()]);

  return (
    <HydrateClient>
      <div className="mt-4">
        <IntegrationsHeader />
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<AppsSkeleton />}>
            <Integrations />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
