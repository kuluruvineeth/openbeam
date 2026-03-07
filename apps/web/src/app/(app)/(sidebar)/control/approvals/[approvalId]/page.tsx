import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { ApprovalDetailSkeleton, ApprovalDetailView } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Approval Detail | Control Plane",
  description: "Approval details and actions",
};

type PageProps = {
  params: Promise<{ approvalId: string }>;
};

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { approvalId } = await params;

  batchPrefetch([trpc.control.approvals.get.queryOptions({ approvalId })]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ApprovalDetailSkeleton />}>
          <ApprovalDetailView approvalId={approvalId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
