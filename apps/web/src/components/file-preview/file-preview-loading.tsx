"use client";

import { Skeleton } from "@/components/ui/skeleton";

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
        <div className="relative w-full max-w-md" key={i}>
          <Skeleton className="aspect-[1/1.4] w-full rounded-sm shadow-lg" />
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
      <Skeleton className="aspect-video w-full max-w-lg rounded-lg" />
    </div>
  );
}

type Category = "pdf" | "image" | "text" | "code" | null;

function ContentSkeleton({ category }: { category: Category }) {
  switch (category) {
    case "pdf":
      return <PdfPagesSkeleton count={2} showLines />;
    case "image":
      return <ImageSkeleton />;
    case "text":
    case "code":
      return <TextSkeleton />;
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
