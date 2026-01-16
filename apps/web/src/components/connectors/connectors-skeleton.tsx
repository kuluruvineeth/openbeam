"use client";

import { Card, Skeleton } from "@openplane/ui";

export function ConnectorsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Table skeleton */}
      <Card>
        <div className="border-border/50 border-b p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            className="border-border/50 border-b p-4 last:border-b-0"
            key={`skeleton-row-${i}`}
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded" />
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
              </div>
              <Skeleton className="ml-auto h-6 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ConnectorsGridSkeleton() {
  return (
    <div className="mx-auto mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card className="border-border/50 p-5" key={`card-skeleton-${i}`}>
          <div className="flex items-start justify-between">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="mt-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
          </div>
          <div className="mt-4 border-border/50 border-t pt-4">
            <Skeleton className="h-9 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ConnectorDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Skeleton className="h-4 w-20" />
        <span className="text-foreground/30">/</span>
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-md" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-full" />

      {/* Content */}
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
