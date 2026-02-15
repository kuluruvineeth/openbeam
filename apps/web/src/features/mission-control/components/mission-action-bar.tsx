"use client";

import {
  Button,
  Icons,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
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
        spawn:
          "border border-border/50 bg-transparent text-foreground hover:bg-muted/50",
        extend_tiers:
          "border border-border/50 bg-transparent text-foreground hover:bg-muted/50",
        broadcast:
          "border border-border/50 bg-transparent text-foreground hover:bg-muted/50",
      },
    },
  }
);

type ActionConfig = {
  action:
    | "start"
    | "pause"
    | "resume"
    | "cancel"
    | "archive"
    | "delete"
    | "spawn"
    | "extend_tiers"
    | "broadcast";
  label: string;
  icon: ReactNode;
  handler: () => void;
  isPending: boolean;
};

type MissionActionBarProps = {
  missionId: string;
  status: string;
};

type SpawnAgentInput = {
  missionId: string;
  name: string;
  role: string;
  tools: string[];
  taskId?: string;
};

export function MissionActionBar({ missionId, status }: MissionActionBarProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const missionActions = useMissionActions(missionId);

  const [showSpawnDialog, setShowSpawnDialog] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState("");

  const boardKey = trpc.missionControl.getBoard.queryOptions({}).queryKey;

  const deleteMutation = useMutation({
    mutationFn: () =>
      getVanillaTRPCClient().missionControl.delete.mutate({ missionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKey });
      router.push("/missions");
    },
    onError: (error: Error) =>
      toast.error("Failed to delete", { description: error.message }),
  });

  const spawnMutation = useMutation({
    mutationFn: (input: SpawnAgentInput) =>
      getVanillaTRPCClient().missionControl.spawnAgent.mutate(input),
    onSuccess: () => {
      toast.success("Agent spawned");
      setShowSpawnDialog(false);
    },
    onError: (error: Error) =>
      toast.error("Failed to spawn agent", { description: error.message }),
  });

  const bulkExtendMutation = useMutation({
    mutationFn: () =>
      getVanillaTRPCClient().missionControl.bulkExtendTimeouts.mutate({
        missionId,
      }),
    onSuccess: () => toast.success("Timeouts extended"),
    onError: (error: Error) =>
      toast.error("Failed to extend timeouts", { description: error.message }),
  });

  const broadcastMutation = useMutation({
    mutationFn: (content: string) =>
      getVanillaTRPCClient().missionControl.broadcastMessage.mutate({
        missionId,
        content,
      }),
    onSuccess: () => {
      toast.success("Message broadcast to all agents");
      setShowBroadcastDialog(false);
      setBroadcastContent("");
    },
    onError: (error: Error) =>
      toast.error("Failed to broadcast", { description: error.message }),
  });

  const anyPending =
    missionActions.isLoading ||
    deleteMutation.isPending ||
    spawnMutation.isPending ||
    bulkExtendMutation.isPending ||
    broadcastMutation.isPending;

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
    (event) => {
      event.preventDefault();
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
    (event) => {
      event.preventDefault();
      missionActions.cancel();
    },
    {
      enabled:
        !anyPending &&
        (status === "DRAFT" || status === "ACTIVE" || status === "PAUSED"),
    },
    [status, anyPending]
  );

  useHotkeys(
    "mod+shift+s",
    (event) => {
      event.preventDefault();
      setShowSpawnDialog(true);
    },
    { enabled: status === "ACTIVE" && !anyPending },
    [status, anyPending]
  );

  useHotkeys(
    "mod+shift+e",
    (event) => {
      event.preventDefault();
      bulkExtendMutation.mutate();
    },
    { enabled: status === "ACTIVE" && !anyPending },
    [status, anyPending]
  );

  useHotkeys(
    "mod+shift+b",
    (event) => {
      event.preventDefault();
      setShowBroadcastDialog(true);
    },
    { enabled: status === "ACTIVE" && !anyPending },
    [status, anyPending]
  );

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 border-border/50 border-t px-4 py-2.5 dark:border-[#1d1d1d]">
        {status === "ACTIVE" && (
          <div className="flex items-center gap-1.5">
            <button
              className={actionButtonVariants({ action: "spawn" })}
              disabled={anyPending}
              onClick={() => setShowSpawnDialog(true)}
              type="button"
            >
              <Icons.Plus size={14} />
              Spawn
            </button>
            <button
              className={actionButtonVariants({ action: "extend_tiers" })}
              disabled={anyPending}
              onClick={() => bulkExtendMutation.mutate()}
              type="button"
            >
              <Icons.Timer size={14} />
              Extend Tiers
            </button>
            <button
              className={actionButtonVariants({ action: "broadcast" })}
              disabled={anyPending}
              onClick={() => setShowBroadcastDialog(true)}
              type="button"
            >
              <Icons.MessageSquare size={14} />
              Broadcast
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {actions.map((config) => (
            <button
              className={actionButtonVariants({ action: config.action })}
              disabled={anyPending || config.isPending}
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

      <Sheet onOpenChange={setShowSpawnDialog} open={showSpawnDialog}>
        <SheetContent className="w-[360px] p-0 sm:max-w-[360px]" side="right">
          <SheetHeader className="border-border/50 border-b px-4 py-3">
            <SheetTitle className="text-base">Spawn Agent</SheetTitle>
          </SheetHeader>
          <SpawnAgentForm
            isPending={spawnMutation.isPending}
            onSubmit={(config) =>
              spawnMutation.mutate({ missionId, ...config })
            }
          />
        </SheetContent>
      </Sheet>

      <Sheet onOpenChange={setShowBroadcastDialog} open={showBroadcastDialog}>
        <SheetContent className="w-[360px] p-0 sm:max-w-[360px]" side="right">
          <SheetHeader className="border-border/50 border-b px-4 py-3">
            <SheetTitle className="text-base">
              Broadcast to All Agents
            </SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <textarea
              className="h-24 w-full resize-none rounded-sm border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onChange={(event) => setBroadcastContent(event.target.value)}
              placeholder="Message to inject into all running agents..."
              value={broadcastContent}
            />
            <div className="mt-3 flex justify-end">
              <Button
                disabled={
                  broadcastContent.trim().length === 0 ||
                  broadcastMutation.isPending
                }
                onClick={() =>
                  broadcastMutation.mutate(broadcastContent.trim())
                }
                size="sm"
              >
                <Icons.ArrowRight size={14} />
                Send
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
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

type SpawnAgentFormProps = {
  onSubmit: (input: {
    name: string;
    role: string;
    tools: string[];
    taskId?: string;
  }) => void;
  isPending: boolean;
};

function SpawnAgentForm({ onSubmit, isPending }: SpawnAgentFormProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [tools, setTools] = useState("");
  const [taskId, setTaskId] = useState("");

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          Name
        </p>
        <input
          className="h-8 w-full rounded-sm border border-border/50 bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          onChange={(event) => setName(event.target.value)}
          placeholder="Agent name"
          value={name}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          Role
        </p>
        <input
          className="h-8 w-full rounded-sm border border-border/50 bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          onChange={(event) => setRole(event.target.value)}
          placeholder="specialist"
          value={role}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          Tools
        </p>
        <input
          className="h-8 w-full rounded-sm border border-border/50 bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          onChange={(event) => setTools(event.target.value)}
          placeholder="search_hybrid, doc_get"
          value={tools}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          Task ID (optional)
        </p>
        <input
          className="h-8 w-full rounded-sm border border-border/50 bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          onChange={(event) => setTaskId(event.target.value)}
          placeholder="task identifier"
          value={taskId}
        />
      </div>
      <div className="flex justify-end">
        <Button
          disabled={
            isPending || name.trim().length === 0 || role.trim().length === 0
          }
          onClick={() =>
            onSubmit({
              name: name.trim(),
              role: role.trim(),
              tools: tools
                .split(",")
                .map((tool) => tool.trim())
                .filter((tool) => tool.length > 0),
              taskId: taskId.trim().length > 0 ? taskId.trim() : undefined,
            })
          }
          size="sm"
        >
          <Icons.Plus size={13} />
          Spawn Agent
        </Button>
      </div>
    </div>
  );
}

export { actionButtonVariants };
