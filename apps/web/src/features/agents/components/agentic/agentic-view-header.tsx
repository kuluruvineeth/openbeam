"use client";

import { useBuilderStatus } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { Skeleton } from "@openplane/ui/components/skeleton";
import { cn } from "@openplane/ui/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Play, Save, Square } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useCanvasPersistence } from "../../hooks/use-canvas-persistence";

interface AgenticViewHeaderProps {
  agentId: string;
  className?: string;
}

export function AgenticViewHeader({
  agentId,
  className,
}: AgenticViewHeaderProps) {
  const trpc = useTRPC();
  const status = useBuilderStatus();
  const { save, isSaving, isDirty } = useCanvasPersistence(agentId);

  const { data: agent } = useSuspenseQuery(
    trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
  );

  const isBuilding = status === "building";

  const getSaveButtonContent = () => {
    if (isSaving) {
      return (
        <>
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          Saving...
        </>
      );
    }
    if (!isDirty) {
      return (
        <>
          <Check className="mr-2 h-3 w-3" />
          Saved
        </>
      );
    }
    return (
      <>
        <Save className="mr-2 h-3 w-3" />
        Save
      </>
    );
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between border-border/50 border-b px-4 py-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost">
          <Link href="/agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-medium">{agent.name}</h1>
          <p className="text-muted-foreground text-xs">
            {agent.description || "Describe your workflow in natural language"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isBuilding ? (
          <Button size="sm" variant="destructive">
            <Square className="mr-2 h-3 w-3" />
            Stop
          </Button>
        ) : (
          <Button disabled={agent.status !== "PUBLISHED"} size="sm">
            <Play className="mr-2 h-3 w-3" />
            Run
          </Button>
        )}
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
    <header className="flex items-center justify-between border-border/50 border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </header>
  );
}
