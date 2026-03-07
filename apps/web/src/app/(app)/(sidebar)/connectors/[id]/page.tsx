import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import {
  ConnectorDetailPage,
  ConnectorDetailSkeleton,
} from "@/features/connectors/components";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Connector ${id} | OpenBeam`,
    description: "View connector details and manage sync settings",
  };
}

export default async function ConnectorDetailPageRoute({ params }: Props) {
  const { id } = await params;

  batchPrefetch([
    trpc.apps.get.queryOptions({ appId: id }),
    trpc.apps.getSyncStatus.queryOptions({ connectorId: id }),
  ]);

  return (
    <HydrateClient>
      <div className="mt-4">
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<ConnectorDetailSkeleton />}>
            <ConnectorDetailPage connectorId={id} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
