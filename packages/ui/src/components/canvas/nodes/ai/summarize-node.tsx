"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { FileText } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface SummarizeNodeConfig {
  style: "brief" | "detailed" | "bullets" | "executive";
  maxLength?: number;
  focusAreas?: string[];
  model?: string;
}

export interface SummarizeNodeData {
  label: string;
  config: SummarizeNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type SummarizeNodeType = Node<SummarizeNodeData, "summarize">;

export const SummarizeNode = memo(
  forwardRef<HTMLDivElement, NodeProps<SummarizeNodeType>>(
    function SummarizeNodeComponent({ data, selected }, ref) {
      const styleLabels: Record<string, string> = {
        brief: "Brief Summary",
        detailed: "Detailed Summary",
        bullets: "Bullet Points",
        executive: "Executive Summary",
      };

      return (
        <div
          className={cn(
            "flex min-w-[200px] flex-col rounded-sm border border-fuchsia-500/50 bg-fuchsia-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-fuchsia-500!"
            position={Position.Left}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-fuchsia-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-fuchsia-500">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
          </div>

          <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Style</span>
              <span className="font-medium text-xs">
                {styleLabels[data.config.style]}
              </span>
            </div>

            {data.config.maxLength && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Max Length
                </span>
                <span className="text-xs">{data.config.maxLength} words</span>
              </div>
            )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-fuchsia-500!"
            position={Position.Right}
            type="source"
          />
        </div>
      );
    }
  )
);
SummarizeNode.displayName = "SummarizeNode";

export function createSummarizeNodeData(): SummarizeNodeData {
  return {
    label: "Summarize",
    config: { style: "brief", maxLength: 200 },
    inputs: [{ id: "content", label: "Content", type: "data", required: true }],
    outputs: [
      { id: "summary", label: "Summary", type: "data", required: true },
    ],
  };
}
