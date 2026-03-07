import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { ApprovalsListView, ApprovalsSkeleton } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Approvals | Control Plane",
  description: "Review and manage agent approvals",
};

export default async function ApprovalsPage() {
  batchPrefetch([trpc.control.approvals.list.queryOptions({})]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ApprovalsSkeleton />}>
          <ApprovalsListView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
