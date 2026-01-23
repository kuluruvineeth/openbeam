"use client";

import { TooltipProvider } from "@openplane/ui/components/tooltip";
import { cn } from "@openplane/ui/utils";
import { forwardRef, Suspense } from "react";
import {
  AgenticViewHeader,
  AgenticViewHeaderSkeleton,
} from "./agentic-view-header";
import { CanvasPanel } from "./canvas-panel";
import { ChatPanel } from "./chat-panel";

interface AgenticViewProps {
  agentId: string;
  className?: string;
}

function AgenticViewContent({ agentId, className }: AgenticViewProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Suspense fallback={<AgenticViewHeaderSkeleton />}>
        <AgenticViewHeader agentId={agentId} />
      </Suspense>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[380px] shrink-0">
          <ChatPanel agentId={agentId} />
        </div>

        <div className="flex-1">
          <CanvasPanel agentId={agentId} />
        </div>
      </div>
    </div>
  );
}

export const AgenticView = forwardRef<HTMLDivElement, AgenticViewProps>(
  ({ agentId, className }, ref) => (
    <TooltipProvider>
      <div className={cn("h-full", className)} ref={ref}>
        <AgenticViewContent agentId={agentId} className="h-full" />
      </div>
    </TooltipProvider>
  )
);

AgenticView.displayName = "AgenticView";
