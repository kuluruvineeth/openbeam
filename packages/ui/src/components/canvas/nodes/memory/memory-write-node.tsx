"use client";

import type {
  MemoryWriteNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Upload } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface MemoryWriteNodeData {
  label: string;
  config: MemoryWriteNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type MemoryWriteNodeType = Node<MemoryWriteNodeData, "memory_write">;

const SCOPE_LABELS: Record<string, string> = {
  workflow: "Workflow",
  user: "User",
  team: "Team",
  global: "Global",
};

function formatTtl(ttlMs: number | undefined): string {
  if (!ttlMs) {
    return "No expiry";
  }
  if (ttlMs >= 86_400_000) {
    return `${Math.round(ttlMs / 86_400_000)}d`;
  }
  if (ttlMs >= 3_600_000) {
    return `${Math.round(ttlMs / 3_600_000)}h`;
  }
  return `${Math.round(ttlMs / 1000)}s`;
}

export const MemoryWriteNode = memo(
  forwardRef<HTMLDivElement, NodeProps<MemoryWriteNodeType>>(
    function MemoryWriteNodeComponent({ data, selected }, ref) {
      const ttlDisplay = formatTtl(data.config.ttlMs);

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
            icon={<Upload className="size-5" />}
            subtitle={SCOPE_LABELS[data.config.scope] ?? "Workflow"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField
                label="Key"
                mono
                value={data.config.key || "Not set"}
              />
              {data.config.namespace && (
                <NodeField
                  label="Namespace"
                  mono
                  value={data.config.namespace}
                />
              )}
              <NodeField label="TTL" value={ttlDisplay} />
              <NodeField
                label="Overwrite"
                value={data.config.overwrite ? "Yes" : "No"}
              />
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

MemoryWriteNode.displayName = "MemoryWriteNode";

export function createMemoryWriteNodeData(): MemoryWriteNodeData {
  return {
    label: "Memory Write",
    config: {
      key: "",
      scope: "workflow",
      overwrite: true,
    },
    inputs: [{ id: "value", label: "Value", type: "data", required: true }],
    outputs: [
      { id: "success", label: "Success", type: "control", required: true },
    ],
  };
}
