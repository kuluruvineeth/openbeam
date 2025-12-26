"use client";

import { JobProgressPanel } from "@/components/jobs/job-progress-panel";
import { useJobProgressSubscription } from "@/hooks/use-job-progress";

export function JobProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useJobProgressSubscription();

  return (
    <>
      {children}
      <JobProgressPanel />
    </>
  );
}
