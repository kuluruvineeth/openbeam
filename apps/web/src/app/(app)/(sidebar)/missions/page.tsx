import { Skeleton } from "@openplane/ui";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { MissionDashboard } from "@/features/mission-control/components/mission-dashboard";

export const metadata: Metadata = {
  title: "Missions | OpenPlane",
  description: "Manage your AI missions",
};

function MissionDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-96" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton className="h-20" key={`mission-stat-${i}`} />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function MissionsPage() {
  return (
    <ErrorBoundary errorComponent={ErrorFallback}>
      <Suspense fallback={<MissionDashboardSkeleton />}>
        <MissionDashboard />
      </Suspense>
    </ErrorBoundary>
  );
}
