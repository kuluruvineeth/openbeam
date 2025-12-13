"use client";

import { useEffect } from "react";
import type { JobProgress } from "@/lib/job-types";
import { useJobStore } from "@/stores/job-store";
import { getVanillaTRPCClient } from "@/trpc/client";

export function useJobProgressSubscription() {
  useEffect(() => {
    const client = getVanillaTRPCClient();

    const subscription = client.jobs.onProgress.subscribe(undefined, {
      onData: (progress: JobProgress) => {
        useJobStore.getState().upsertJob(progress);
      },
      onError: () => {
        // Subscription errors are expected when not authenticated
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
