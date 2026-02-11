import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { notFound } from "next/navigation";
import { ErrorFallback } from "@/components/error-fallback";
import { MissionDetailLoader } from "@/features/mission-control/components/mission-detail-loader";
import { HydrateClient } from "@/trpc/server";

type MissionDetailPageProps = {
  params: Promise<{ missionId: string }>;
};

export async function generateMetadata({
  params,
}: MissionDetailPageProps): Promise<Metadata> {
  const { missionId } = await params;
  return {
    title: `Mission ${missionId} | OpenPlane`,
    description: "View and manage your AI mission",
  };
}

export default async function MissionDetailPage({
  params,
}: MissionDetailPageProps) {
  const { missionId } = await params;

  if (!missionId) {
    notFound();
  }

  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <MissionDetailLoader missionId={missionId} />
      </ErrorBoundary>
    </HydrateClient>
  );
}
