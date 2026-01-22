"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@openplane/ui";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import {
  usePauseConnector,
  useResumeConnector,
  useTriggerSync,
} from "../hooks/use-sync";
import { isPaused, isSyncing, type SyncStatusType } from "../lib/sync-types";

type SyncControlsProps = {
  connectorId: string;
  syncStatus: SyncStatusType | undefined;
};

export function SyncControls({ connectorId, syncStatus }: SyncControlsProps) {
  const [syncType, setSyncType] = useState<"FULL" | "INCREMENTAL">("FULL");

  const triggerSync = useTriggerSync({
    onSuccess: () => {
      toast.success("Sync started successfully");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to start sync: ${message}`);
    },
  });

  const pauseConnector = usePauseConnector({
    onSuccess: () => {
      toast.success("Connector paused successfully");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to pause connector: ${message}`);
    },
  });

  const resumeConnector = useResumeConnector({
    onSuccess: () => {
      toast.success("Connector resumed successfully");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to resume connector: ${message}`);
    },
  });

  const syncing = isSyncing(syncStatus);
  const paused = isPaused(syncStatus);

  return (
    <Card className="border bg-background">
      <CardHeader className="pb-4">
        <CardTitle className="font-medium text-sm">Manual Sync</CardTitle>
        <CardDescription className="text-xs">
          Trigger a manual sync or pause/resume automatic syncing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={syncing || paused || triggerSync.isPending}
            onClick={() => {
              setSyncType("FULL");
              triggerSync.mutate({ connectorId, type: "FULL" });
            }}
            variant={syncType === "FULL" ? "default" : "outline"}
          >
            <Icons.Sparkle className="mr-2" size={16} />
            Full Sync
          </Button>
          <Button
            className="flex-1"
            disabled={syncing || paused || triggerSync.isPending}
            onClick={() => {
              setSyncType("INCREMENTAL");
              triggerSync.mutate({ connectorId, type: "INCREMENTAL" });
            }}
            variant={syncType === "INCREMENTAL" ? "default" : "outline"}
          >
            <Icons.History className="mr-2" size={16} />
            Incremental Sync
          </Button>
        </div>

        <Separator className="bg-border" />

        <div className="pt-4">
          {paused ? (
            <SubmitButton
              className="w-full"
              isSubmitting={resumeConnector.isPending}
              onClick={() => resumeConnector.mutate({ connectorId })}
              variant="outline"
            >
              Resume Connector
            </SubmitButton>
          ) : (
            <SubmitButton
              className="w-full"
              disabled={syncing}
              isSubmitting={pauseConnector.isPending}
              onClick={() => pauseConnector.mutate({ connectorId })}
              variant="outline"
            >
              Pause Connector
            </SubmitButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
