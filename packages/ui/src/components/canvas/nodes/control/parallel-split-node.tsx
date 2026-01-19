"use client";

import type {
  NodeStatus,
  ParallelSplitNodeConfig,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Split } from "lucide-react";
import { forwardRef, memo, useMemo } from "react";
import { NodeHeader, NodeShell } from "../primitives";

export interface ParallelSplitNodeData {
  label: string;
  config: ParallelSplitNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ParallelSplitNodeType = Node<ParallelSplitNodeData, "parallel_split">;

export const ParallelSplitNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ParallelSplitNodeType>>(
    function ParallelSplitNodeComponent({ data, selected }, ref) {
      const branchCount = data.config.branches || 2;

      const handles = useMemo(() => {
        const result: Array<{
          id?: string;
          type: "source" | "target";
          position: Position;
          offset?: string;
        }> = [{ type: "target", position: Position.Left }];

        for (let i = 0; i < branchCount; i++) {
          const offset = `${((i + 1) / (branchCount + 1)) * 100}%`;
          result.push({
            id: `branch-${i}`,
            type: "source",
            position: Position.Right,
            offset,
          });
        }
        return result;
      }, [branchCount]);

      return (
        <NodeShell
          handles={handles}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-parallel"
            icon={<Split className="size-5" />}
            subtitle={`${branchCount} parallel branches`}
            title={data.label}
          />
        </NodeShell>
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
