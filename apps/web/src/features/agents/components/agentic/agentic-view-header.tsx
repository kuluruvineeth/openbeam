"use client";

import { Icons, useBuilderStatus } from "@openbeam/ui";
import { Button } from "@openbeam/ui/components/button";
import { Skeleton } from "@openbeam/ui/components/skeleton";
import { cn } from "@openbeam/ui/utils";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useCanvasPersistence } from "../../hooks/use-canvas-persistence";
import { AgenticViewTabs, type AgentViewTab } from "./agentic-view-tabs";

interface AgenticViewHeaderProps {
  agentId: string;
  activeTab: AgentViewTab;
  onTabChange: (tab: AgentViewTab) => void;
  hasLiveExecution?: boolean;
  executionCount?: number;
  className?: string;
}

export function AgenticViewHeader({
  agentId,
  activeTab,
  onTabChange,
  hasLiveExecution = false,
  executionCount,
  className,
}: AgenticViewHeaderProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const status = useBuilderStatus();
  const { save, isSaving, isDirty } = useCanvasPersistence(agentId);

  const { data: agent } = useSuspenseQuery(
    trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
  );

  const publishMutation = useMutation({
    ...trpc.agentCanvas.publish.mutationOptions(),
    onSuccess: () => {
      toast.success("Agent published");
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
          .queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.list.infiniteQueryOptions({}, {}).queryKey,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createExecutionMutation = useMutation({
    ...trpc.agentCanvas.createExecution.mutationOptions(),
    onSuccess: (_execution) => {
      toast.success("Execution started");
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.listExecutions.queryKey(),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isBuilding = status === "building";
  const isPublishing = publishMutation.isPending;
  const isRunning = createExecutionMutation.isPending;
  const publishLabel = agent.status === "PUBLISHED" ? "Republish" : "Publish";

  const getSaveButtonContent = () => {
    if (isSaving) {
      return (
        <>
          <Icons.Loader2 className="mr-2 h-3 w-3 animate-spin" />
          Saving...
        </>
      );
    }
    if (!isDirty) {
      return (
        <>
          <Icons.Check className="mr-2 h-3 w-3" />
          Saved
        </>
      );
    }
    return (
      <>
        <Icons.Upload className="mr-2 h-3 w-3" />
        Save
      </>
    );
  };

  const handlePublish = async () => {
    if (isSaving || isPublishing) {
      return;
    }
    if (isDirty) {
      try {
        await save();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
        return;
      }
    }
    await publishMutation.mutateAsync({ canvasId: agentId });
  };

  const handleRun = async () => {
    if (isRunning) {
      return;
    }
    await createExecutionMutation.mutateAsync({
      canvasId: agentId,
      triggerSource: "manual",
    });
  };

  return (
    <header
      className={cn("flex items-center justify-between px-4 py-3", className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button asChild size="icon" variant="ghost">
          <Link href="/agents">
            <Icons.ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate font-medium">{agent.name}</h1>
          <p className="truncate text-muted-foreground text-xs">
            {agent.description || "Describe your workflow in natural language"}
          </p>
        </div>
      </div>

      <AgenticViewTabs
        activeTab={activeTab}
        executionCount={executionCount}
        hasLiveExecution={hasLiveExecution}
        onTabChange={onTabChange}
      />

      <div className="flex flex-1 items-center justify-end gap-2">
        {isBuilding ? (
          <Button size="sm" variant="destructive">
            <Icons.Square className="mr-2 h-3 w-3" />
            Stop
          </Button>
        ) : (
          <Button
            disabled={agent.status !== "PUBLISHED" || isRunning}
            onClick={handleRun}
            size="sm"
          >
            <Icons.Play className="mr-2 h-3 w-3" />
            Run
          </Button>
        )}
        <Button
          disabled={isPublishing || isSaving}
          onClick={handlePublish}
          size="sm"
          variant="outline"
        >
          {isPublishing ? "Publishing..." : publishLabel}
        </Button>
        <Button
          disabled={!isDirty || isSaving}
          onClick={() => save()}
          size="sm"
          variant="outline"
        >
          {getSaveButtonContent()}
        </Button>
      </div>
    </header>
  );
}

export function AgenticViewHeaderSkeleton() {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <Skeleton className="h-9 w-48" />
      <div className="flex flex-1 items-center justify-end gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </header>
  );
}
