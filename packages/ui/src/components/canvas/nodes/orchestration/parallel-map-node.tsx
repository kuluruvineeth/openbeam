"use client";

import type {
  NodeStatus,
  ParallelMapNodeConfig,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { GitFork } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ParallelMapNodeData {
  label: string;
  config: ParallelMapNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ParallelMapNodeType = Node<ParallelMapNodeData, "parallel_map">;

function formatTimeout(timeoutMs: number | undefined): string {
  if (!timeoutMs) {
    return "No limit";
  }
  if (timeoutMs >= 60_000) {
    return `${Math.round(timeoutMs / 60_000)}m`;
  }
  return `${Math.round(timeoutMs / 1000)}s`;
}

export const ParallelMapNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ParallelMapNodeType>>(
    function ParallelMapNodeComponent({ data, selected }, ref) {
      const timeoutDisplay = formatTimeout(data.config.timeout);

      return (
        <NodeShell
          handles={[
            { type: "target", position: Position.Left },
            { type: "source", position: Position.Right },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-orchestration"
            icon={<GitFork className="size-5" />}
            subtitle="Parallel"
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField
                label="Collection"
                mono
                value={data.config.collection || "Not set"}
              />
              <NodeField
                label="Concurrency"
                mono
                value={data.config.maxConcurrency}
              />
              {data.config.batchSize && (
                <NodeField
                  label="Batch Size"
                  mono
                  value={data.config.batchSize}
                />
              )}
              <NodeField label="Timeout" value={timeoutDisplay} />
              <NodeField
                label="Continue on Error"
                value={data.config.continueOnError ? "Yes" : "No"}
              />
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ParallelMapNode.displayName = "ParallelMapNode";

export function createParallelMapNodeData(): ParallelMapNodeData {
  return {
    label: "Parallel Map",
    config: {
      collection: "",
      maxConcurrency: 10,
      continueOnError: false,
    },
    inputs: [{ id: "items", label: "Items", type: "data", required: true }],
    outputs: [
      { id: "results", label: "Results", type: "data", required: true },
      { id: "errors", label: "Errors", type: "data", required: false },
    ],
  };
}
