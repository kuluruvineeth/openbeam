import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { IssueDetailSkeleton, IssueDetailView } from "@/features/control";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{ issueId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { issueId } = await params;
  return {
    title: `Issue ${issueId} | Control Plane | OpenBeam`,
    description: "View issue details",
  };
}

export default async function ControlIssueDetailPage({ params }: Props) {
  const { issueId } = await params;

  batchPrefetch([
    trpc.control.issues.get.queryOptions({ issueId }),
    trpc.control.issues.listComments.queryOptions({ issueId }),
  ]);

  return (
    <HydrateClient>
      <div className="mt-4">
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<IssueDetailSkeleton />}>
            <IssueDetailView issueId={issueId} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
