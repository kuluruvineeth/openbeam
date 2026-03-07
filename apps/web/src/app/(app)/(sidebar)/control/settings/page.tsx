import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { SettingsView } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Settings | Control Plane | OpenBeam",
  description: "Manage control plane settings, secrets, and access",
};

export default async function ControlSettingsPage() {
  batchPrefetch([
    trpc.control.secrets.list.queryOptions(),
    trpc.control.access.listMembers.queryOptions(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense
          fallback={
            <div className="p-6 text-muted-foreground text-sm">
              Loading settings...
            </div>
          }
        >
          <SettingsView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
