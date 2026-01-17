"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Split } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface ParallelSplitNodeConfig {
  branches: number;
}

export interface ParallelSplitNodeData {
  label: string;
  config: ParallelSplitNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type ParallelSplitNodeType = Node<ParallelSplitNodeData, "parallel_split">;

export const ParallelSplitNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ParallelSplitNodeType>>(
    function ParallelSplitNodeComponent({ data, selected }, ref) {
      const branchCount = data.config.branches || 2;

      return (
        <div
          className={cn(
            "flex min-w-[180px] flex-col rounded-sm border border-cyan-500/50 bg-cyan-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-cyan-500!"
            position={Position.Left}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-cyan-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-cyan-500">
              <Split className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">Parallel Split</span>
          </div>

          <div className="border-border/50 border-t px-3 py-2">
            <div className="text-muted-foreground text-xs">
              {branchCount} parallel branches
            </div>
          </div>

          {data.outputs.map((output, idx) => {
            const position = ((idx + 1) / (branchCount + 1)) * 100;
            return (
              <Handle
                className="h-3! w-3! border-2! border-background! bg-cyan-500!"
                id={output.id}
                key={output.id}
                position={Position.Right}
                style={{ top: `${position}%` }}
                type="source"
              />
            );
          })}
        </div>
      );
    }
  )
);
ParallelSplitNode.displayName = "ParallelSplitNode";

export function createParallelSplitNodeData(
  branches = 2
): ParallelSplitNodeData {
  return {
    label: "Parallel Split",
    config: { branches },
    inputs: [{ id: "input", label: "Input", type: "control", required: true }],
    outputs: Array.from({ length: branches }).map((_, i) => ({
      id: `branch-${i}`,
      label: `Branch ${i + 1}`,
      type: "control" as const,
      required: false,
    })),
  };
}
