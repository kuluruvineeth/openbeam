"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Merge } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface ParallelJoinNodeConfig {
  branches: number;
  joinType: "all" | "any" | "race";
  timeout?: number;
}

export interface ParallelJoinNodeData {
  label: string;
  config: ParallelJoinNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type ParallelJoinNodeType = Node<ParallelJoinNodeData, "parallel_join">;

export const ParallelJoinNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ParallelJoinNodeType>>(
    function ParallelJoinNodeComponent({ data, selected }, ref) {
      const branchCount = data.config.branches || 2;
      const joinLabels: Record<string, string> = {
        all: "Wait for all",
        any: "Wait for any",
        race: "First wins",
      };

      return (
        <div
          className={cn(
            "flex min-w-[180px] flex-col rounded-sm border border-cyan-500/50 bg-cyan-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          {data.inputs.map((input, idx) => {
            const position = ((idx + 1) / (branchCount + 1)) * 100;
            return (
              <Handle
                className="h-3! w-3! border-2! border-background! bg-cyan-500!"
                id={input.id}
                key={input.id}
                position={Position.Left}
                style={{ top: `${position}%` }}
                type="target"
              />
            );
          })}

          <div className="flex items-center gap-2 rounded-t-sm bg-cyan-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-cyan-500">
              <Merge className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">Parallel Join</span>
          </div>

          <div className="border-border/50 border-t px-3 py-2">
            <div className="text-muted-foreground text-xs">
              {joinLabels[data.config.joinType]}
            </div>
            {data.config.timeout && (
              <div className="mt-1 text-muted-foreground/70 text-xs">
                Timeout: {data.config.timeout}ms
              </div>
            )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-cyan-500!"
            position={Position.Right}
            type="source"
          />
        </div>
      );
    }
  )
);
ParallelJoinNode.displayName = "ParallelJoinNode";

export function createParallelJoinNodeData(branches = 2): ParallelJoinNodeData {
  return {
    label: "Parallel Join",
    config: { branches, joinType: "all" },
    inputs: Array.from({ length: branches }).map((_, i) => ({
      id: `branch-${i}`,
      label: `Branch ${i + 1}`,
      type: "control" as const,
      required: true,
    })),
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
  };
}
