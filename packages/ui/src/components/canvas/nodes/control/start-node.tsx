"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Play } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface StartNodeConfig {
  triggerType: "manual" | "schedule" | "webhook" | "event";
  schedule?: string;
  webhookPath?: string;
  eventType?: string;
}

export interface StartNodeData {
  label: string;
  config: StartNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type StartNodeType = Node<StartNodeData, "start">;

export const StartNode = memo(
  forwardRef<HTMLDivElement, NodeProps<StartNodeType>>(
    function StartNodeComponent({ data, selected }, ref) {
      const triggerLabels: Record<string, string> = {
        manual: "Manual Trigger",
        schedule: "Scheduled",
        webhook: "Webhook",
        event: "Event",
      };

      return (
        <div
          className={cn(
            "flex min-w-[160px] flex-col rounded-sm border border-green-500/50 bg-green-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <div className="flex items-center gap-2 rounded-t-sm bg-green-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-green-500 text-white">
              <Play className="h-3 w-3" />
            </div>
            <span className="font-medium text-sm">Start</span>
          </div>

          <div className="border-border/50 border-t px-3 py-2">
            <div className="text-muted-foreground text-xs">
              {triggerLabels[data.config.triggerType]}
            </div>
            {data.config.triggerType === "schedule" && data.config.schedule && (
              <div className="mt-1 font-mono text-xs">
                {data.config.schedule}
              </div>
            )}
            {data.config.triggerType === "webhook" &&
              data.config.webhookPath && (
                <div className="mt-1 truncate font-mono text-xs">
                  {data.config.webhookPath}
                </div>
              )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-green-500!"
            position={Position.Right}
            type="source"
          />
        </div>
      );
    }
  )
);
StartNode.displayName = "StartNode";

export function createStartNodeData(
  triggerType: StartNodeConfig["triggerType"] = "manual"
): StartNodeData {
  return {
    label: "Start",
    config: { triggerType },
    inputs: [],
    outputs: [
      { id: "output", label: "Output", type: "control", required: true },
    ],
  };
}
