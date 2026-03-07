import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { ProjectsListView } from "@/features/control/components/projects/projects-list-view";
import { ProjectsSkeleton } from "@/features/control/components/projects/projects-skeleton";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Projects | Control Plane | OpenBeam",
  description: "Manage agent projects and workspaces",
};

export default async function ProjectsPage() {
  batchPrefetch([trpc.control.projects.list.queryOptions({})]);

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ProjectsSkeleton />}>
          <ProjectsListView />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
