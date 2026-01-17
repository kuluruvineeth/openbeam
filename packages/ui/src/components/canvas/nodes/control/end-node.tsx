"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Square } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface EndNodeConfig {
  outputType: "result" | "notification" | "webhook" | "none";
  webhookUrl?: string;
  notificationChannel?: string;
}

export interface EndNodeData {
  label: string;
  config: EndNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type EndNodeType = Node<EndNodeData, "end">;

export const EndNode = memo(
  forwardRef<HTMLDivElement, NodeProps<EndNodeType>>(function EndNodeComponent(
    { data, selected },
    ref
  ) {
    const outputLabels: Record<string, string> = {
      result: "Return Result",
      notification: "Send Notification",
      webhook: "Call Webhook",
      none: "No Output",
    };

    return (
      <div
        className={cn(
          "flex min-w-[160px] flex-col rounded-sm border border-red-500/50 bg-red-500/5 shadow-sm",
          selected && "ring-2 ring-primary ring-offset-1"
        )}
        ref={ref}
      >
        <Handle
          className="h-3! w-3! border-2! border-background! bg-red-500!"
          position={Position.Left}
          type="target"
        />

        <div className="flex items-center gap-2 rounded-t-sm bg-red-500/10 px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-red-500 text-white">
            <Square className="h-3 w-3" />
          </div>
          <span className="font-medium text-sm">End</span>
        </div>

        <div className="border-border/50 border-t px-3 py-2">
          <div className="text-muted-foreground text-xs">
            {outputLabels[data.config.outputType]}
          </div>
        </div>
      </div>
    );
  })
);
EndNode.displayName = "EndNode";

export function createEndNodeData(
  outputType: EndNodeConfig["outputType"] = "result"
): EndNodeData {
  return {
    label: "End",
    config: { outputType },
    inputs: [{ id: "input", label: "Input", type: "control", required: true }],
    outputs: [],
  };
}
