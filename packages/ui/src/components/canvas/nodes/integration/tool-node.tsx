"use client";

import type { NodeStatus, Port, ToolNodeConfig } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ToolNodeData {
  label: string;
  config: ToolNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ToolNodeType = Node<ToolNodeData, "tool">;

export const ToolNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ToolNodeType>>(
    function ToolNodeComponent({ data, selected }, ref) {
      const paramCount = data.config.params
        ? Object.keys(data.config.params).length
        : 0;

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
            colorVar="--node-integration"
            icon={<Icons.Wrench size={20} />}
            subtitle={data.config.toolId || "Select tool"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField
                label="Tool ID"
                mono
                value={data.config.toolId || "Not configured"}
              />
              {paramCount > 0 && (
                <NodeField
                  label="Parameters"
                  mono
                  value={`${paramCount} configured`}
                />
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ToolNode.displayName = "ToolNode";

export function createToolNodeData(): ToolNodeData {
  return {
    label: "Tool",
    config: {
      toolId: "",
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: false }],
    outputs: [{ id: "result", label: "Result", type: "data", required: true }],
  };
}
