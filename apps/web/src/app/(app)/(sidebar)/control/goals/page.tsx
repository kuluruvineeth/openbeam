import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { GoalsSkeleton } from "@/features/control/components/goals/goals-skeleton";
import { GoalsView } from "@/features/control/components/goals/goals-view";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Goals | Control Plane | OpenBeam",
  description: "Track and manage agent goals",
};

export default async function GoalsPage() {
  batchPrefetch([trpc.control.goals.list.queryOptions({})]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<GoalsSkeleton />}>
          <GoalsView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
