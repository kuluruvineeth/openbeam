"use client";

import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icons,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ArtifactStatus, ArtifactType } from "./artifact-card";

const artifactListItemVariants = cva(
  "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors",
  {
    variants: {
      selected: {
        true: "border-l-2 border-l-primary bg-primary/5",
        false: "border-l-2 border-l-transparent hover:bg-muted/30",
      },
    },
    defaultVariants: { selected: false },
  }
);

const TYPE_ICONS: Record<ArtifactType, ReactNode> = {
  document: <Icons.File size={14} />,
  report: <Icons.FileText size={14} />,
  code: <Icons.Code size={14} />,
  data: <Icons.Table size={14} />,
  image: <Icons.Image size={14} />,
  other: <Icons.Download size={14} />,
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type ArtifactListItemProps = {
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
  onDownload: () => void;
};

export const ArtifactListItem = memo(function ArtifactListItemInner({
  artifact,
  isSelected,
  onSelect,
  onDownload,
}: ArtifactListItemProps) {
  return (
    <button
      className={cn(artifactListItemVariants({ selected: isSelected }))}
      onClick={onSelect}
      type="button"
    >
      <span className="shrink-0 text-muted-foreground">
        {TYPE_ICONS[artifact.type]}
      </span>

      <span className="min-w-0 flex-1 truncate font-medium text-sm">
        {artifact.title}
      </span>

      <span className="hidden shrink-0 text-muted-foreground text-xs sm:inline">
        {artifact.agentName}
      </span>

      <span className="shrink-0 font-mono text-muted-foreground text-xs">
        v{artifact.version}
      </span>

      <Badge
        className="hidden shrink-0 text-[10px] capitalize sm:inline-flex"
        variant="outline"
      >
        {artifact.type}
      </Badge>

      <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
        {formatTimestamp(artifact.createdAt)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            type="button"
          >
            <Icons.MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Icons.Download className="mr-2" size={14} />
            Download
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  );
});

export { artifactListItemVariants };
