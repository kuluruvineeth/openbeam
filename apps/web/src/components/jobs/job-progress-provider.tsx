"use client";

import { useJobProgressSubscription } from "@/hooks/use-job-progress";
import { JobProgressPanel } from "./job-progress-panel";

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
