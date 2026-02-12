"use client";

import { Icons } from "@openplane/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { getVanillaTRPCClient, useTRPC } from "@/trpc/client";
import { useMissionActions } from "../hooks/use-mission-actions";

const actionButtonVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium text-sm transition-all duration-200",
  {
    variants: {
      action: {
        start: "bg-primary text-primary-foreground hover:bg-primary/90",
        pause:
          "border border-border/50 bg-transparent text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
        resume: "bg-primary text-primary-foreground hover:bg-primary/90",
        cancel:
          "border border-border/50 bg-transparent text-destructive hover:bg-destructive/10",
        archive:
          "border border-border/50 bg-muted text-muted-foreground hover:bg-muted/80",
        delete:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
    },
  }
);

type ActionConfig = {
  action: "start" | "pause" | "resume" | "cancel" | "archive" | "delete";
  label: string;
  icon: React.ReactNode;
  handler: () => void;
  isPending: boolean;
};

type MissionActionBarProps = {
  missionId: string;
  status: string;
};

export function MissionActionBar({ missionId, status }: MissionActionBarProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const missionActions = useMissionActions(missionId);

  const boardKey = trpc.missionControl.getBoard.queryOptions({}).queryKey;

  const deleteMutation = useMutation({
    mutationFn: () =>
      getVanillaTRPCClient().missionControl.delete.mutate({ missionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKey });
      router.push("/missions");
    },
    onError: (e: Error) =>
      toast.error("Failed to delete", { description: e.message }),
  });

  const anyPending = missionActions.isLoading || deleteMutation.isPending;

  const actions = getActionsForStatus(status, {
    start: {
      handler: missionActions.start,
      isPending: missionActions.isLoading,
    },
    pause: {
      handler: missionActions.pause,
      isPending: missionActions.isLoading,
    },
    resume: {
      handler: missionActions.resume,
      isPending: missionActions.isLoading,
    },
    cancel: {
      handler: missionActions.cancel,
      isPending: missionActions.isLoading,
    },
    archive: {
      handler: missionActions.archive,
      isPending: missionActions.isLoading,
    },
    delete: {
      handler: () => deleteMutation.mutate(),
      isPending: deleteMutation.isPending,
    },
  });

  const isPausable = status === "ACTIVE";
  const isResumable = status === "PAUSED";

  useHotkeys(
    "mod+p",
    (e) => {
      e.preventDefault();
      if (isPausable) {
        missionActions.pause();
      }
      if (isResumable) {
        missionActions.resume();
      }
    },
    { enabled: (isPausable || isResumable) && !anyPending },
    [isPausable, isResumable, anyPending]
  );

  useHotkeys(
    "mod+shift+c",
    (e) => {
      e.preventDefault();
      missionActions.cancel();
    },
    {
      enabled:
        !anyPending &&
        (status === "DRAFT" || status === "ACTIVE" || status === "PAUSED"),
    },
    [status, anyPending]
  );

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-border/50 border-t px-4 py-2.5 dark:border-[#1d1d1d]">
      <div className="ml-auto flex items-center gap-2">
        {actions.map((config) => (
          <button
            className={actionButtonVariants({ action: config.action })}
            disabled={anyPending}
            key={config.action}
            onClick={config.handler}
            type="button"
          >
            {config.icon}
            {config.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type ActionEntry = {
  handler: () => void;
  isPending: boolean;
};

function getActionsForStatus(
  status: string,
  entries: Record<string, ActionEntry>
): ActionConfig[] {
  switch (status) {
    case "DRAFT":
      return [
        {
          action: "start",
          label: "Start Mission",
          icon: <Icons.Play size={14} />,
          ...entries.start,
        },
        {
          action: "cancel",
          label: "Cancel",
          icon: <Icons.X size={14} />,
          ...entries.cancel,
        },
      ];
    case "ACTIVE":
      return [
        {
          action: "pause",
          label: "Pause",
          icon: <Icons.Pause size={14} />,
          ...entries.pause,
        },
        {
          action: "cancel",
          label: "Cancel",
          icon: <Icons.X size={14} />,
          ...entries.cancel,
        },
      ];
    case "PAUSED":
      return [
        {
          action: "resume",
          label: "Resume",
          icon: <Icons.Play size={14} />,
          ...entries.resume,
        },
        {
          action: "cancel",
          label: "Cancel",
          icon: <Icons.X size={14} />,
          ...entries.cancel,
        },
      ];
    case "COMPLETED":
      return [
        {
          action: "archive",
          label: "Archive",
          icon: <Icons.Archive size={14} />,
          ...entries.archive,
        },
      ];
    case "CANCELLED":
      return [
        {
          action: "archive",
          label: "Archive",
          icon: <Icons.Archive size={14} />,
          ...entries.archive,
        },
        {
          action: "delete",
          label: "Delete",
          icon: <Icons.Trash size={14} />,
          ...entries.delete,
        },
      ];
    case "ARCHIVED":
      return [
        {
          action: "delete",
          label: "Delete",
          icon: <Icons.Trash size={14} />,
          ...entries.delete,
        },
      ];
    default:
      return [];
  }
}

export { actionButtonVariants };
