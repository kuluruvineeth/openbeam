import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { ProjectDetailSkeleton } from "@/features/control/components/projects/project-detail-skeleton";
import { ProjectDetailView } from "@/features/control/components/projects/project-detail-view";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{ projectId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: `Project ${projectId} | Control Plane | OpenBeam`,
    description: "View project details",
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;

  batchPrefetch([trpc.control.projects.get.queryOptions({ projectId })]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ProjectDetailSkeleton />}>
          <ProjectDetailView projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
