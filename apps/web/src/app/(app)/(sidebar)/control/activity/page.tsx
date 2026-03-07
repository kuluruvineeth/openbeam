import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { ActivitySkeleton, ActivityView } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Activity | Control Plane | OpenBeam",
  description: "View activity log for agents and entities",
};

export default async function ControlActivityPage() {
  batchPrefetch([trpc.control.activity.list.queryOptions({})]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ActivitySkeleton />}>
          <ActivityView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
