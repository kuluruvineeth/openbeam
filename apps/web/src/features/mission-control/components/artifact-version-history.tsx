"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const versionPillVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 font-mono text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-primary/10 font-medium text-primary",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

type ArtifactVersion = {
  version: number;
  createdAt: number;
  agentName: string;
  changeDescription?: string;
};

type ArtifactVersionHistoryProps = {
  versions: ArtifactVersion[];
  selectedVersion: number;
  onVersionSelect: (v: number) => void;
  showDiff: boolean;
  onDiffToggle: () => void;
};

function formatShortTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ArtifactVersionHistory({
  versions,
  selectedVersion,
  onVersionSelect,
  showDiff,
  onDiffToggle,
}: ArtifactVersionHistoryProps) {
  return (
    <div className="flex items-center gap-2 border-border/50 border-b px-4 py-2">
      <div className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
        {versions.map((v) => (
          <button
            className={cn(
              versionPillVariants({ active: v.version === selectedVersion })
            )}
            key={v.version}
            onClick={() => onVersionSelect(v.version)}
            title={`${v.agentName} - ${formatShortTimestamp(v.createdAt)}${v.changeDescription ? ` - ${v.changeDescription}` : ""}`}
            type="button"
          >
            v{v.version}
          </button>
        ))}
      </div>

      {versions.length > 1 && (
        <button
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-xs transition-colors",
            showDiff
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
          onClick={onDiffToggle}
          type="button"
        >
          <Icons.GitBranch size={12} />
          Diff
        </button>
      )}
    </div>
  );
}

export { versionPillVariants, type ArtifactVersion };
