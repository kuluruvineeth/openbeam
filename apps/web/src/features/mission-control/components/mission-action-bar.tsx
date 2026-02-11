"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useHotkeys } from "react-hotkeys-hook";

const actionButtonVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium text-sm transition-colors",
  {
    variants: {
      action: {
        start: "bg-primary text-primary-foreground hover:bg-primary/90",
        pause:
          "border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
        resume: "bg-primary text-primary-foreground hover:bg-primary/90",
        cancel:
          "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
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
};

function getActionsForStatus(
  status: string,
  handlers: Record<string, () => void>
): ActionConfig[] {
  switch (status) {
    case "DRAFT":
      return [
        {
          action: "start",
          label: "Start Mission",
          icon: <Icons.Play size={14} />,
          handler: handlers.start ?? noop,
        },
        {
          action: "cancel",
          label: "Cancel",
          icon: <Icons.X size={14} />,
          handler: handlers.cancel ?? noop,
        },
      ];
    case "ACTIVE":
      return [
        {
          action: "pause",
          label: "Pause",
          icon: <Icons.Pause size={14} />,
          handler: handlers.pause ?? noop,
        },
        {
          action: "cancel",
          label: "Cancel",
          icon: <Icons.X size={14} />,
          handler: handlers.cancel ?? noop,
        },
      ];
    case "PAUSED":
      return [
        {
          action: "resume",
          label: "Resume",
          icon: <Icons.Play size={14} />,
          handler: handlers.resume ?? noop,
        },
        {
          action: "cancel",
          label: "Cancel",
          icon: <Icons.X size={14} />,
          handler: handlers.cancel ?? noop,
        },
      ];
    case "COMPLETED":
      return [
        {
          action: "archive",
          label: "Archive",
          icon: <Icons.Archive size={14} />,
          handler: handlers.archive ?? noop,
        },
      ];
    case "CANCELLED":
      return [
        {
          action: "archive",
          label: "Archive",
          icon: <Icons.Archive size={14} />,
          handler: handlers.archive ?? noop,
        },
        {
          action: "delete",
          label: "Delete",
          icon: <Icons.Trash size={14} />,
          handler: handlers.delete ?? noop,
        },
      ];
    case "ARCHIVED":
      return [
        {
          action: "delete",
          label: "Delete",
          icon: <Icons.Trash size={14} />,
          handler: handlers.delete ?? noop,
        },
      ];
    default:
      return [];
  }
}

function noop() {
  return;
}

type MissionActionBarProps = {
  missionId: string;
  status: string;
};

export function MissionActionBar({
  missionId: _missionId,
  status,
}: MissionActionBarProps) {
  const handlers: Record<string, () => void> = {
    start: noop,
    pause: noop,
    resume: noop,
    cancel: noop,
    archive: noop,
    delete: noop,
  };

  const actions = getActionsForStatus(status, handlers);

  const isPausable = status === "ACTIVE";
  const isResumable = status === "PAUSED";

  useHotkeys(
    "mod+p",
    (e) => {
      e.preventDefault();
      if (isPausable) {
        handlers.pause();
      }
      if (isResumable) {
        handlers.resume();
      }
    },
    { enabled: isPausable || isResumable },
    [isPausable, isResumable]
  );

  useHotkeys(
    "mod+shift+c",
    (e) => {
      e.preventDefault();
      handlers.cancel();
    },
    {
      enabled: status === "DRAFT" || status === "ACTIVE" || status === "PAUSED",
    },
    [status]
  );

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-border/50 border-t px-4 py-2.5">
      <div className="ml-auto flex items-center gap-2">
        {actions.map((config) => (
          <button
            className={actionButtonVariants({ action: config.action })}
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

export { actionButtonVariants };
