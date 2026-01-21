"use client";

import { Icons } from "@/components/icons";
import { formatFileSize } from "@/lib/format";
import type { SlackFile } from "@/lib/slack-types";

type SlackFileListProps = {
  files: SlackFile[];
  onFileClick?: (file: SlackFile) => void;
};

export function SlackFileList({ files, onFileClick }: SlackFileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {files.map((file) => (
        <button
          className="flex w-full items-center gap-2 rounded border border-border/50 bg-muted px-2.5 py-1.5 text-left transition-colors hover:bg-muted/80"
          key={file.id}
          onClick={() => onFileClick?.(file)}
          type="button"
        >
          <Icons.Attachment className="size-3 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
            {file.name}
          </span>
          {file.size && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {formatFileSize(file.size)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
