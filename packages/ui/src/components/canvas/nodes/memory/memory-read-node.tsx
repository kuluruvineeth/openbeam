"use client";

import type {
  MemoryReadNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Download } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface MemoryReadNodeData {
  label: string;
  config: MemoryReadNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type MemoryReadNodeType = Node<MemoryReadNodeData, "memory_read">;

const SCOPE_LABELS: Record<string, string> = {
  workflow: "Workflow",
  user: "User",
  team: "Team",
  global: "Global",
};

export const MemoryReadNode = memo(
  forwardRef<HTMLDivElement, NodeProps<MemoryReadNodeType>>(
    function MemoryReadNodeComponent({ data, selected }, ref) {
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
            icon={<Download className="size-5" />}
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
              {data.config.defaultValue !== undefined && (
                <NodeField label="Default" mono value="Configured" />
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

MemoryReadNode.displayName = "MemoryReadNode";

export function createMemoryReadNodeData(): MemoryReadNodeData {
  return {
    label: "Memory Read",
    config: {
      key: "",
      scope: "workflow",
    },
    outputs: [{ id: "value", label: "Value", type: "data", required: true }],
  };
}
