import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { IssuesListView, IssuesSkeleton } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Issues | Control Plane | OpenBeam",
  description: "Manage agent work items and tasks",
};

export default async function ControlIssuesPage() {
  batchPrefetch([
    trpc.control.issues.list.queryOptions({}),
    trpc.control.issues.count.queryOptions({}),
    trpc.control.issues.listLabels.queryOptions(),
  ]);

  return (
    <HydrateClient>
      <div className="mt-4">
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<IssuesSkeleton />}>
            <IssuesListView />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
