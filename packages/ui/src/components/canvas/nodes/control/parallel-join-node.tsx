"use client";

import type {
  NodeStatus,
  ParallelJoinNodeConfig,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Merge } from "lucide-react";
import { forwardRef, memo, useMemo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ParallelJoinNodeData {
  label: string;
  config: ParallelJoinNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ParallelJoinNodeType = Node<ParallelJoinNodeData, "parallel_join">;

const JOIN_LABELS: Record<string, string> = {
  all: "Wait for all",
  any: "Wait for any",
  race: "First wins",
};

export const ParallelJoinNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ParallelJoinNodeType>>(
    function ParallelJoinNodeComponent({ data, selected }, ref) {
      const branchCount = data.config.branches || 2;

      const handles = useMemo(() => {
        const result: Array<{
          id?: string;
          type: "source" | "target";
          position: Position;
          offset?: string;
        }> = [];

        for (let i = 0; i < branchCount; i++) {
          const offset = `${((i + 1) / (branchCount + 1)) * 100}%`;
          result.push({
            id: `branch-${i}`,
            type: "target",
            position: Position.Left,
            offset,
          });
        }
        result.push({ type: "source", position: Position.Right });
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
            icon={<Merge className="size-5" />}
            subtitle={JOIN_LABELS[data.config.joinType]}
            title={data.label}
          />
          {data.config.timeout && (
            <NodeSection>
              <NodeField
                label="Timeout"
                mono
                value={`${data.config.timeout}ms`}
              />
            </NodeSection>
          )}
        </NodeShell>
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
