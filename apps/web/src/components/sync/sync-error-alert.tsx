"use client";

import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTriggerSync } from "@/hooks/use-sync";

type SyncErrorAlertProps = {
  connectorId: string;
  error: string;
};

export function SyncErrorAlert({ connectorId, error }: SyncErrorAlertProps) {
  const triggerSync = useTriggerSync({
    onSuccess: () => {
      toast.success("Sync restarted successfully");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to restart sync: ${message}`);
    },
  });

  return (
    <Alert className="p-3" variant="destructive">
      <Icons.XIcon className="size-4" />
      <AlertTitle className="text-sm">Sync Error</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-foreground/60 text-xs">{error}</p>
        <SubmitButton
          isSubmitting={triggerSync.isPending}
          onClick={() => triggerSync.mutate({ connectorId, type: "FULL" })}
          size="sm"
          variant="outline"
        >
          Retry Sync
        </SubmitButton>
      </AlertDescription>
    </Alert>
  );
}
