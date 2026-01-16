"use client";

import { Alert, AlertDescription, AlertTitle } from "@openplane/ui";
import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";

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
    <Alert
      className="flex items-center justify-between [&>svg]:static [&>svg~*]:pl-0"
      variant="destructive"
    >
      <div className="flex items-center gap-3">
        <Icons.Alert02 className="size-4 shrink-0 text-destructive" />
        <div>
          <AlertTitle className="text-sm">Scheduled for deletion</AlertTitle>
          <AlertDescription className="text-foreground/60 text-xs">
            Permanent deletion in {timeRemaining}
          </AlertDescription>
        </div>
      </div>
      {canRestore && (
        <SubmitButton
          className="shrink-0"
          isSubmitting={isRestoring}
          onClick={onCancel}
          size="sm"
          variant="outline"
        >
          Cancel Deletion
        </SubmitButton>
      )}
    </Alert>
  );
}
