"use client";

import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
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
    <div className="border border-destructive/50 bg-destructive/10 p-3">
      <div className="flex items-start gap-3">
        <Icons.XIcon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="flex-1 space-y-2">
          <div>
            <p className="font-medium text-destructive text-sm">Sync Error</p>
            <p className="text-destructive/80 text-xs">{error}</p>
          </div>
          <Button
            disabled={triggerSync.isPending}
            onClick={() => triggerSync.mutate({ connectorId, type: "FULL" })}
            size="sm"
            variant="outline"
          >
            {triggerSync.isPending ? "Retrying..." : "Retry Sync"}
          </Button>
        </div>
      </div>
    </div>
  );
}
