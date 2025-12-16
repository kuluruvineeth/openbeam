"use client";

import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

type DeletionWarningBannerProps = {
  scheduledDeletionAt: Date;
  onCancel: () => void;
  isRestoring: boolean;
  canRestore: boolean;
};

export function DeletionWarningBanner({
  scheduledDeletionAt,
  onCancel,
  isRestoring,
  canRestore,
}: DeletionWarningBannerProps) {
  const timeRemaining = formatDistanceToNow(scheduledDeletionAt, {
    addSuffix: false,
  });

  return (
    <div className="flex items-center justify-between border border-destructive/20 bg-destructive/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center bg-destructive/10">
          <Icons.Alert02 className="text-destructive" size={16} />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">
            Scheduled for deletion
          </p>
          <p className="text-foreground/60 text-xs">
            Permanent deletion in {timeRemaining}
          </p>
        </div>
      </div>
      {canRestore && (
        <Button
          disabled={isRestoring}
          onClick={onCancel}
          size="sm"
          variant="outline"
        >
          {isRestoring ? "Restoring..." : "Cancel Deletion"}
        </Button>
      )}
    </div>
  );
}
