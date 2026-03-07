import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { DashboardSkeleton, DashboardView } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Control Plane | OpenBeam",
  description: "Agent control plane dashboard",
};

export default async function ControlDashboardPage() {
  batchPrefetch([
    trpc.control.dashboard.summary.queryOptions(),
    trpc.control.dashboard.recentActivity.queryOptions(),
  ]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
