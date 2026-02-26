"use client";

import { Skeleton } from "@openplane/ui";
import { useMemo } from "react";

type PdfSkeletonProps = {
  count?: number;
  showLines?: boolean;
};

export function PdfPagesSkeleton({
  count = 3,
  showLines = true,
}: PdfSkeletonProps) {
  return (
    <div className="flex h-full flex-col items-center gap-4 p-4 pt-8">
      {Array.from({ length: count }, (_, i) => (
        <div className="relative w-full max-w-md" key={`pdf-page-${i}`}>
          <Skeleton className="aspect-[1/1.4] w-full rounded-sm" />
          {showLines && (
            <div className="absolute inset-0 flex flex-col gap-2 p-6">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
              <div className="mt-4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TextSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Skeleton className="h-3 w-1/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-3/4" />
      <div className="mt-2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
      <div className="mt-2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function ImageSkeleton() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Skeleton className="aspect-video w-full max-w-lg rounded-md" />
    </div>
  );
}

export function DocxSkeleton() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-8">
      <Skeleton className="h-6 w-2/3" />
      <div className="mt-2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="mt-3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <div className="mt-3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SpreadsheetSkeleton() {
  return (
    <div className="flex flex-col p-4">
      <div className="mb-3 flex gap-2">
        <Skeleton className="h-7 w-20 rounded" />
        <Skeleton className="h-7 w-16 rounded" />
        <Skeleton className="h-7 w-24 rounded" />
      </div>
      <div className="overflow-hidden rounded border border-border/50">
        <div className="flex border-border/50 border-b bg-muted/30">
          {Array.from({ length: 6 }, (_, idx) => (
            <Skeleton
              className="h-8 flex-1 rounded-none"
              key={`header-${idx}`}
            />
          ))}
        </div>
        {Array.from({ length: 10 }, (_, rowIdx) => (
          <div
            className="flex border-border/30 border-b last:border-b-0"
            key={`row-${rowIdx}`}
          >
            {[0, 1, 2, 3, 4, 5].map((colIdx) => (
              <Skeleton
                className="h-7 flex-1 rounded-none"
                key={`cell-${colIdx}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PresentationSkeleton() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="aspect-video w-80 rounded-md" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function VideoSkeleton() {
  return (
    <div className="flex h-full">
      <div className="flex flex-1 items-center justify-center bg-black/5 dark:bg-black/20">
        <Skeleton className="aspect-video w-full max-w-2xl rounded-md" />
      </div>
      <div className="w-80 shrink-0 border-border/50 border-l">
        <div className="flex h-10 items-center gap-2 border-border/50 border-b px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton className="h-6 flex-1" key={`tab-skeleton-${i}`} />
          ))}
        </div>
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="flex gap-3" key={`comment-skeleton-${i}`}>
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AudioSkeleton() {
  const barHeights = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        const seed = ((i * 7 + 13) * 17) % 60;
        return 20 + seed;
      }),
    []
  );

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex h-24 items-end gap-[2px] px-8">
          {barHeights.map((height, i) => (
            <Skeleton
              className="w-[3px] rounded-[1px]"
              key={`bar-${i}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-8 flex items-center gap-4">
          <Skeleton className="size-10 rounded" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-8 rounded" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
      <div className="w-80 shrink-0 border-border/50 border-l">
        <div className="flex h-9 items-center gap-2 border-border/50 border-b px-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-5 flex-1" key={`audio-tab-${i}`} />
          ))}
        </div>
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="flex gap-2.5" key={`line-skeleton-${i}`}>
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Category =
  | "pdf"
  | "image"
  | "text"
  | "code"
  | "docx"
  | "spreadsheet"
  | "presentation"
  | "video"
  | "audio"
  | null;

function ContentSkeleton({ category }: { category: Category }) {
  switch (category) {
    case "pdf":
      return <PdfPagesSkeleton count={2} showLines />;
    case "image":
      return <ImageSkeleton />;
    case "text":
    case "code":
      return <TextSkeleton />;
    case "docx":
      return <DocxSkeleton />;
    case "spreadsheet":
      return <SpreadsheetSkeleton />;
    case "presentation":
      return <PresentationSkeleton />;
    case "video":
      return <VideoSkeleton />;
    case "audio":
      return <AudioSkeleton />;
    default:
      return <PdfPagesSkeleton count={2} showLines={false} />;
  }
}

type Props = {
  category?: Category;
};

export function FilePreviewLoading({ category = null }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-border/50 border-b px-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-8 rounded" />
          <Skeleton className="size-8 rounded" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ContentSkeleton category={category} />
      </div>
    </div>
  );
}
