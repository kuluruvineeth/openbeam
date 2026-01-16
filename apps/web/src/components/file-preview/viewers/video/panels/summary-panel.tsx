"use client";

import { Skeleton } from "@openplane/ui";
import { Icons } from "@/components/icons";
import type { MediaGist } from "@/lib/media-types";

type SummaryPanelProps = {
  summary?: string;
  gist?: MediaGist;
  isLoadingSummary: boolean;
  isLoadingGist?: boolean;
};

export function SummaryPanel({
  summary,
  gist,
  isLoadingSummary,
  isLoadingGist = false,
}: SummaryPanelProps) {
  return (
    <div className="flex flex-col gap-4 p-3">
      <SummarySection isLoading={isLoadingSummary} summary={summary} />
      {(gist || isLoadingGist) && (
        <GistSection gist={gist} isLoading={isLoadingGist} />
      )}
    </div>
  );
}

function SummarySection({
  summary,
  isLoading,
}: {
  summary?: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-1.5 font-medium text-[11px] text-foreground/70 uppercase tracking-wider">
        Summary
      </h3>
      <p className="text-[13px] text-foreground/80 leading-relaxed">
        {summary}
      </p>
    </div>
  );
}

function GistSection({
  gist,
  isLoading,
}: {
  gist?: MediaGist;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-14" />
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton className="h-5 w-14" key={i} />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-16" />
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton className="h-5 w-12" key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!gist) {
    return null;
  }

  return (
    <div className="space-y-3">
      {gist.topics && gist.topics.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1">
            <Icons.Hash className="size-3 text-foreground/40" />
            <h3 className="font-medium text-[11px] text-foreground/70 uppercase tracking-wider">
              Topics
            </h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {gist.topics.map((topic, i) => (
              <span
                className="bg-foreground/[0.05] px-2 py-0.5 text-[11px] text-foreground/70"
                key={i}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {gist.hashtags && gist.hashtags.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1">
            <Icons.Hash className="size-3 text-foreground/40" />
            <h3 className="font-medium text-[11px] text-foreground/70 uppercase tracking-wider">
              Hashtags
            </h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {gist.hashtags.map((tag, i) => (
              <span
                className="bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                key={i}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
