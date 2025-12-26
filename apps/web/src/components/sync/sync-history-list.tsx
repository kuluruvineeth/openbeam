"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Icons } from "@/components/icons";
import { SyncHistoryItem } from "@/components/sync/sync-history-item";
import { Skeleton } from "@/components/ui/skeleton";
import type { SyncHistoryEntry } from "@/lib/sync-types";

type SyncHistoryPage = {
  history: SyncHistoryEntry[];
  nextCursor?: number | null;
};

type SyncHistoryListProps = {
  data?: InfiniteData<SyncHistoryPage>;
  isLoading: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

function HistorySkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="flex items-center gap-3 px-3 py-2.5" key={i}>
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <div className="ml-auto flex gap-3">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.02]">
        <div className="absolute top-1/3 left-1/3">
          <Icons.History size={80} />
        </div>
      </div>
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center border border-border/50 bg-background">
          <Icons.History className="text-foreground/30" size={18} />
        </div>
        <p className="font-medium text-foreground/70 text-sm">No syncs yet</p>
        <p className="mt-1 text-foreground/40 text-xs">
          History appears after the first sync
        </p>
      </div>
    </div>
  );
}

export function SyncHistoryList({
  data,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: SyncHistoryListProps) {
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const history = data?.pages.flatMap((p) => p.history) ?? [];

  if (isLoading) {
    return (
      <div className="border border-border/50">
        <HistorySkeleton />
      </div>
    );
  }

  if (!history.length) {
    return <EmptyState />;
  }

  return (
    <ol aria-label="Sync history" className="list-none border border-border/50">
      {history.map((entry) => (
        <li key={entry.id}>
          <SyncHistoryItem entry={entry} />
        </li>
      ))}
      {(hasNextPage || isFetchingNextPage) && (
        <li className="flex justify-center py-3" ref={ref}>
          {isFetchingNextPage && (
            <Icons.Loader2Icon
              className="animate-spin text-foreground/30"
              size={14}
            />
          )}
        </li>
      )}
    </ol>
  );
}
