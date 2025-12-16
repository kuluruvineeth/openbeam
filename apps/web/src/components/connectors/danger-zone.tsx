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

function PauseResumeAction({
  connectorId,
  isPaused,
  isDeleting,
  canPerformAction,
}: {
  connectorId: string;
  isPaused: boolean;
  isDeleting: boolean;
  canPerformAction: boolean;
}) {
  const pauseMutation = usePauseConnector();
  const resumeMutation = useResumeConnector();

  if (isPaused) {
    return (
      <Button
        disabled={!canPerformAction || resumeMutation.isPending}
        onClick={() => resumeMutation.mutate(connectorId)}
        size="sm"
        variant="outline"
      >
        {resumeMutation.isPending ? "Resuming..." : "Resume"}
      </Button>
    );
  }

  return (
    <Button
      disabled={!canPerformAction || isDeleting || pauseMutation.isPending}
      onClick={() => pauseMutation.mutate(connectorId)}
      size="sm"
      variant="outline"
    >
      {pauseMutation.isPending ? "Pausing..." : "Pause"}
    </Button>
  );
}

function DeleteOrRestoreAction({
  connectorId,
  isDeleting,
  canPerformAction,
  showPermissionMessage,
  scheduledDate,
}: {
  connectorId: string;
  isDeleting: boolean;
  canPerformAction: boolean;
  showPermissionMessage: boolean;
  scheduledDate: Date | null;
}) {
  const disconnectMutation = useDisconnectConnector();
  const restoreMutation = useRestoreConnector();

  if (isDeleting) {
    const description = scheduledDate
      ? `Scheduled for ${format(scheduledDate, "PPp")}`
      : "Deletion scheduled";

    return (
      <DangerZoneItem
        action={
          <Button
            disabled={!canPerformAction || restoreMutation.isPending}
            onClick={() => restoreMutation.mutate(connectorId)}
            size="sm"
            variant="outline"
          >
            {restoreMutation.isPending ? "Restoring..." : "Cancel Deletion"}
          </Button>
        }
        description={description}
        showPermissionMessage={showPermissionMessage}
        title="Cancel Deletion"
      />
    );
  }

  return (
    <DangerZoneItem
      action={
        <DeleteConnectorDialog
          disabled={!canPerformAction}
          isPending={disconnectMutation.isPending}
          onConfirm={() => disconnectMutation.mutate(connectorId)}
        />
      }
      description="Remove connector and all indexed data. 72-hour grace period to cancel."
      showPermissionMessage={showPermissionMessage}
      title="Delete Connector"
    />
  );
}

export function DangerZone({
  connectorId,
  status,
  scheduledDeletionAt,
}: DangerZoneProps) {
  const { isAdmin, isLoading: isRoleLoading } = useIsAdmin();
  const isDeleting = status === "DELETING";
  const isPaused = status === "INACTIVE";

  const scheduledDate = scheduledDeletionAt
    ? new Date(scheduledDeletionAt)
    : null;

  const canPerformAction = isAdmin && !isRoleLoading;
  const showPermissionMessage = !(isAdmin || isRoleLoading);

  return (
    <div className="mt-8 border border-destructive/20">
      <div className="border-destructive/20 border-b bg-destructive/5 px-4 py-2">
        <h3 className="font-medium text-foreground text-sm">Danger Zone</h3>
      </div>

      <div className="divide-y divide-border/50">
        <DangerZoneItem
          action={
            <PauseResumeAction
              canPerformAction={canPerformAction}
              connectorId={connectorId}
              isDeleting={isDeleting}
              isPaused={isPaused}
            />
          }
          description="Temporarily stop syncing. Indexed data remains searchable."
          showPermissionMessage={showPermissionMessage}
          title="Pause Connector"
        />

        <DeleteOrRestoreAction
          canPerformAction={canPerformAction}
          connectorId={connectorId}
          isDeleting={isDeleting}
          scheduledDate={scheduledDate}
          showPermissionMessage={showPermissionMessage}
        />
      </div>
    </div>
  );
}

type DangerZoneItemProps = {
  title: string;
  description: string;
  action: React.ReactNode;
  showPermissionMessage: boolean;
};

function DangerZoneItem({
  title,
  description,
  action,
  showPermissionMessage,
}: DangerZoneItemProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className={cn(showPermissionMessage && "opacity-50")}>
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-foreground/50 text-xs">{description}</p>
        {showPermissionMessage && (
          <p className="mt-1 text-[10px] text-foreground/40">
            Admin or Owner role required
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
