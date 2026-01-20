"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@openplane/ui";
import { format } from "date-fns";
import { SubmitButton } from "@/components/submit-button";
import {
  useDisconnectConnector,
  usePauseConnector,
  useRestoreConnector,
  useResumeConnector,
} from "@/features/connectors/hooks";
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
      <SubmitButton
        disabled={!canPerformAction}
        isSubmitting={resumeMutation.isPending}
        onClick={() => resumeMutation.mutate(connectorId)}
        size="sm"
        variant="outline"
      >
        Resume
      </SubmitButton>
    );
  }

  return (
    <SubmitButton
      disabled={!canPerformAction || isDeleting}
      isSubmitting={pauseMutation.isPending}
      onClick={() => pauseMutation.mutate(connectorId)}
      size="sm"
      variant="outline"
    >
      Pause
    </SubmitButton>
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
          <SubmitButton
            disabled={!canPerformAction}
            isSubmitting={restoreMutation.isPending}
            onClick={() => restoreMutation.mutate(connectorId)}
            size="sm"
            variant="outline"
          >
            Cancel Deletion
          </SubmitButton>
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
    <Card className="mt-8 border-destructive/20">
      <CardHeader className="bg-destructive/5 px-4 py-2">
        <CardTitle className="font-medium text-foreground text-sm">
          Danger Zone
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
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

        <Separator className="bg-border/50" />

        <DeleteOrRestoreAction
          canPerformAction={canPerformAction}
          connectorId={connectorId}
          isDeleting={isDeleting}
          scheduledDate={scheduledDate}
          showPermissionMessage={showPermissionMessage}
        />
      </CardContent>
    </Card>
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
