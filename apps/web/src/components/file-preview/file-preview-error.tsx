"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

type FilePreviewErrorProps = {
  error?: string;
  onRetry?: () => void;
  onClose: () => void;
};

export function FilePreviewError({
  error,
  onRetry,
  onClose,
}: FilePreviewErrorProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-border/50 border-b px-4">
        <p className="font-medium text-foreground/50 text-sm">Preview Error</p>
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
          <div className="flex size-12 items-center justify-center bg-destructive/10">
            <Icons.AlertCircle className="text-destructive/70" size={24} />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground/80 text-sm">
              Unable to load preview
            </p>
            <p className="max-w-[200px] text-foreground/50 text-xs">
              {error ||
                "The file could not be loaded. It may have been moved or deleted."}
            </p>
          </div>
          {onRetry && (
            <Button
              className="h-8 px-3 text-xs"
              onClick={onRetry}
              variant="outline"
            >
              <Icons.RefreshCw className="mr-1.5" size={12} />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
