"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  useDisconnectConnector,
  usePauseConnector,
  useRestoreConnector,
  useResumeConnector,
} from "@/hooks/use-connectors";
import { useIsAdmin } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";
import { DeleteConnectorDialog } from "./delete-connector-dialog";

type DangerZoneProps = {
  connectorId: string;
  status: string;
  scheduledDeletionAt?: Date | string | null;
};

export function DangerZone({
  connectorId,
  status,
  scheduledDeletionAt,
}: DangerZoneProps) {
  const isAdmin = useIsAdmin();
  const isDeleting = status === "DELETING";
  const isPaused = status === "INACTIVE";

  const pauseMutation = usePauseConnector();
  const resumeMutation = useResumeConnector();
  const disconnectMutation = useDisconnectConnector();
  const restoreMutation = useRestoreConnector();

  const scheduledDate = scheduledDeletionAt
    ? new Date(scheduledDeletionAt)
    : null;

  return (
    <div className="mt-8 border border-destructive/20">
      <div className="border-destructive/20 border-b bg-destructive/5 px-4 py-2">
        <h3 className="font-medium text-foreground text-sm">Danger Zone</h3>
      </div>

      <div className="divide-y divide-border/50">
        <DangerZoneItem
          action={
            isPaused ? (
              <Button
                disabled={!isAdmin || resumeMutation.isPending}
                onClick={() => resumeMutation.mutate(connectorId)}
                size="sm"
                variant="outline"
              >
                {resumeMutation.isPending ? "Resuming..." : "Resume"}
              </Button>
            ) : (
              <Button
                disabled={!isAdmin || isDeleting || pauseMutation.isPending}
                onClick={() => pauseMutation.mutate(connectorId)}
                size="sm"
                variant="outline"
              >
                {pauseMutation.isPending ? "Pausing..." : "Pause"}
              </Button>
            )
          }
          description="Temporarily stop syncing. Indexed data remains searchable."
          disabled={!isAdmin}
          title="Pause Connector"
        />

        {isDeleting ? (
          <DangerZoneItem
            action={
              <Button
                disabled={!isAdmin || restoreMutation.isPending}
                onClick={() => restoreMutation.mutate(connectorId)}
                size="sm"
                variant="outline"
              >
                {restoreMutation.isPending ? "Restoring..." : "Cancel Deletion"}
              </Button>
            }
            description={
              scheduledDate
                ? `Scheduled for ${format(scheduledDate, "PPp")}`
                : "Deletion scheduled"
            }
            disabled={!isAdmin}
            title="Cancel Deletion"
          />
        ) : (
          <DangerZoneItem
            action={
              <DeleteConnectorDialog
                disabled={!isAdmin}
                isPending={disconnectMutation.isPending}
                onConfirm={() => disconnectMutation.mutate(connectorId)}
              />
            }
            description="Remove connector and all indexed data. 72-hour grace period to cancel."
            disabled={!isAdmin}
            title="Delete Connector"
          />
        )}
      </div>
    </div>
  );
}

type DangerZoneItemProps = {
  title: string;
  description: string;
  action: React.ReactNode;
  disabled: boolean;
};

function DangerZoneItem({
  title,
  description,
  action,
  disabled,
}: DangerZoneItemProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className={cn(disabled && "opacity-50")}>
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-foreground/50 text-xs">{description}</p>
        {disabled && (
          <p className="mt-1 text-[10px] text-foreground/40">
            Admin or Owner role required
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
