"use client";

import { Button } from "@openplane/ui";
import { Icons } from "@/components/icons";
import { getFileTypeLabel } from "@/lib/file-preview-config";
import { formatFileSize } from "@/lib/format";

type FilePreviewUnsupportedProps = {
  fileName: string;
  mimeType: string;
  fileSize?: number;
  url: string;
  onClose: () => void;
};

export function FilePreviewUnsupported({
  fileName,
  mimeType,
  fileSize,
  url,
  onClose,
}: FilePreviewUnsupportedProps) {
  const typeLabel = getFileTypeLabel(mimeType);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-border/50 border-b px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground/90 text-sm">
            {fileName}
          </p>
          <p className="font-mono text-[10px] text-foreground/40">
            {typeLabel}
          </p>
        </div>
        <Button
          className="size-8"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <Icons.Close className="text-foreground/50" size={14} />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center bg-foreground/[0.03]">
            <Icons.FileIcon className="text-foreground/30" size={32} />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground/80 text-sm">
              Preview not available
            </p>
            <p className="max-w-[200px] text-foreground/50 text-xs">
              This file type cannot be previewed in the browser
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              className="h-8 px-3 text-xs"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              variant="outline"
            >
              <Icons.ExternalLink className="mr-1.5" size={12} />
              Download file
            </Button>
            {fileSize && (
              <p className="font-mono text-[10px] text-foreground/30 tabular-nums">
                {formatFileSize(fileSize)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
