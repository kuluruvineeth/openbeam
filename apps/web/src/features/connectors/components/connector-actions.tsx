"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openplane/ui";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import {
  usePauseConnector,
  useResumeConnector,
  useTriggerSync,
} from "@/hooks/use-sync";

type ConnectorActionsProps = {
  connectorId: string;
  status: string;
};

export function ConnectorActions({
  connectorId,
  status,
}: ConnectorActionsProps) {
  const triggerSync = useTriggerSync({
    onSuccess: () => {
      toast.success("Sync started");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Sync failed: ${message}`);
    },
  });

  const pauseConnector = usePauseConnector({
    onSuccess: () => {
      toast.success("Connector paused");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to pause: ${message}`);
    },
  });

  const resumeConnector = useResumeConnector({
    onSuccess: () => {
      toast.success("Connector resumed");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to resume: ${message}`);
    },
  });

  const isPaused = status === "INACTIVE";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          <Icons.Settings size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={isPaused || triggerSync.isPending}
          onClick={() => triggerSync.mutate({ connectorId, type: "FULL" })}
        >
          <Icons.Sparkle className="mr-2" size={14} />
          Full Sync
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isPaused || triggerSync.isPending}
          onClick={() =>
            triggerSync.mutate({ connectorId, type: "INCREMENTAL" })
          }
        >
          <Icons.RefreshCw className="mr-2" size={14} />
          Quick Sync
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.location.href = `/connectors/${connectorId}`;
          }}
        >
          <Icons.Settings className="mr-2" size={14} />
          Manage
        </DropdownMenuItem>
        {isPaused ? (
          <DropdownMenuItem
            disabled={resumeConnector.isPending}
            onClick={() => resumeConnector.mutate({ connectorId })}
          >
            <Icons.CheckIcon className="mr-2" size={14} />
            Resume
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={pauseConnector.isPending}
            onClick={() => pauseConnector.mutate({ connectorId })}
          >
            <Icons.Close className="mr-2" size={14} />
            Pause
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
