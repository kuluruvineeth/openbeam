"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFileTypeLabel } from "@/lib/file-preview-config";
import { formatFileSize } from "@/lib/format";

type FilePreviewHeaderProps = {
  fileName: string;
  mimeType: string;
  fileSize?: number;
  pageCount?: number | null;
  url: string;
  onClose: () => void;
};

export function FilePreviewHeader({
  fileName,
  mimeType,
  fileSize,
  pageCount,
  url,
  onClose,
}: FilePreviewHeaderProps) {
  const typeLabel = getFileTypeLabel(mimeType);

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 overflow-hidden border-border/50 border-b px-4">
      <div className="min-w-0 flex-1">
        <p className="overflow-hidden text-ellipsis font-medium text-foreground/90 text-sm">
          {fileName}
        </p>
        <div className="flex items-center gap-2 font-mono text-[10px] text-foreground/40">
          <span>{typeLabel}</span>
          {fileSize && (
            <>
              <span className="text-foreground/20">·</span>
              <span className="tabular-nums">{formatFileSize(fileSize)}</span>
            </>
          )}
          {pageCount && (
            <>
              <span className="text-foreground/20">·</span>
              <span className="tabular-nums">
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-8"
                onClick={() =>
                  window.open(url, "_blank", "noopener,noreferrer")
                }
                size="icon"
                variant="ghost"
              >
                <Icons.ExternalLink className="text-foreground/50" size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Open in new tab</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-8"
                onClick={onClose}
                size="icon"
                variant="ghost"
              >
                <Icons.Close className="text-foreground/50" size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">
                Close{" "}
                <kbd className="ml-1 text-[10px] text-foreground/30">Esc</kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
