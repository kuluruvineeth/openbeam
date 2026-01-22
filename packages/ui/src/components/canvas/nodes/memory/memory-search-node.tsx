"use client";

import type {
  MemorySearchNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Search } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface MemorySearchNodeData {
  label: string;
  config: MemorySearchNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type MemorySearchNodeType = Node<MemorySearchNodeData, "memory_search">;

const SCOPE_LABELS: Record<string, string> = {
  workflow: "Workflow",
  user: "User",
  team: "Team",
  global: "Global",
};

export const MemorySearchNode = memo(
  forwardRef<HTMLDivElement, NodeProps<MemorySearchNodeType>>(
    function MemorySearchNodeComponent({ data, selected }, ref) {
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
            colorVar="--node-memory"
            icon={<Search className="size-5" />}
            subtitle={SCOPE_LABELS[data.config.scope] ?? "Workflow"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              {data.config.query ? (
                <p className="truncate font-mono text-muted-foreground/70 text-xs">
                  {data.config.query.slice(0, 30)}
                  {data.config.query.length > 30 ? "..." : ""}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">No query set</p>
              )}
              <NodeField label="Top K" mono value={data.config.topK} />
              {data.config.threshold !== undefined && (
                <NodeField
                  label="Threshold"
                  mono
                  value={data.config.threshold}
                />
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

MemorySearchNode.displayName = "MemorySearchNode";

export function createMemorySearchNodeData(): MemorySearchNodeData {
  return {
    label: "Memory Search",
    config: {
      query: "",
      scope: "workflow",
      topK: 10,
      includeMetadata: true,
    },
    inputs: [{ id: "query", label: "Query", type: "data", required: false }],
    outputs: [
      { id: "results", label: "Results", type: "data", required: true },
    ],
  };
}
