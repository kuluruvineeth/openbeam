"use client";

import { Icons, Skeleton } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ArtifactType = "document" | "report" | "code" | "data" | "image" | "other";

type ArtifactStatus = "generating" | "completed" | "failed";

const artifactCardVariants = cva(
  "group relative flex h-56 cursor-pointer flex-col overflow-hidden rounded-md border transition-colors",
  {
    variants: {
      status: {
        generating: "border-border/50 bg-muted/20",
        completed: "border-border/50 hover:border-border hover:bg-muted/30",
        failed: "border-red-500/20 bg-red-500/5 hover:border-red-500/40",
      },
      selected: {
        true: "border-primary bg-primary/5",
        false: "",
      },
    },
    defaultVariants: {
      status: "completed",
      selected: false,
    },
  }
);

const TYPE_ICONS: Record<ArtifactType, (size: number) => ReactNode> = {
  document: (size) => <Icons.File size={size} />,
  report: (size) => <Icons.FileText size={size} />,
  code: (size) => <Icons.Code size={size} />,
  data: (size) => <Icons.Table size={size} />,
  image: (size) => <Icons.Image size={size} />,
  other: (size) => <Icons.Download size={size} />,
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type ArtifactCardProps = {
  artifact: {
    artifactId: string;
    title: string;
    type: ArtifactType;
    agentName: string;
    version: number;
    status: ArtifactStatus;
    createdAt: number;
    previewUrl?: string;
  };
  isSelected: boolean;
  onSelect: () => void;
};

export const ArtifactCard = memo(function ArtifactCardInner({
  artifact,
  isSelected,
  onSelect,
}: ArtifactCardProps) {
  if (artifact.status === "generating") {
    return (
      <button
        className={cn(
          artifactCardVariants({ status: "generating", selected: isSelected })
        )}
        onClick={onSelect}
        type="button"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <Skeleton className="h-8 w-8 rounded-sm" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="border-border/30 border-t px-3 py-2">
          <Skeleton className="h-3 w-24" />
        </div>
      </button>
    );
  }

  return (
    <button
      className={cn(
        artifactCardVariants({
          status: artifact.status,
          selected: isSelected,
        })
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="absolute top-2 right-2 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        v{artifact.version}
      </span>

      {artifact.status === "failed" && (
        <span className="absolute top-2 left-2">
          <Icons.AlertCircle className="text-red-500" size={14} />
        </span>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
        {TYPE_ICONS[artifact.type](28)}
        <span className="line-clamp-2 text-center font-medium text-foreground text-sm">
          {artifact.title}
        </span>
      </div>

      <div className="flex items-center justify-between border-border/30 border-t px-3 py-2">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <span className="truncate">{artifact.agentName}</span>
          <span className="text-border">|</span>
          <span className="capitalize">{artifact.type}</span>
        </div>
        <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
          {formatTimestamp(artifact.createdAt)}
        </span>
      </div>
    </button>
  );
});

export {
  artifactCardVariants,
  type ArtifactCardProps,
  type ArtifactType,
  type ArtifactStatus,
};
