"use client";

import type {
  NodeStatus,
  Port,
  TriggerManualNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ManualTriggerNodeData {
  label: string;
  config: TriggerManualNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ManualTriggerNodeType = Node<ManualTriggerNodeData, "trigger_manual">;

export const ManualTriggerNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ManualTriggerNodeType>>(
    function ManualTriggerNodeComponent({ data, selected }, ref) {
      const inputCount = data.config.inputSchema?.length ?? 0;

      return (
        <NodeShell
          handles={[{ type: "source", position: Position.Right }]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-trigger"
            icon={<Icons.Play size={20} />}
            subtitle="Manual start"
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              {inputCount > 0 ? (
                <NodeField label="Inputs" mono value={`${inputCount} fields`} />
              ) : (
                <p className="text-muted-foreground text-xs">
                  No input schema defined
                </p>
              )}
              {data.config.requiredPermissions &&
                data.config.requiredPermissions.length > 0 && (
                  <NodeField
                    label="Permissions"
                    mono
                    value={`${data.config.requiredPermissions.length} required`}
                  />
                )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ManualTriggerNode.displayName = "ManualTriggerNode";

export function createManualTriggerNodeData(): ManualTriggerNodeData {
  return {
    label: "Manual Trigger",
    config: {},
    outputs: [
      { id: "trigger", label: "Trigger", type: "control", required: true },
    ],
  };
}
