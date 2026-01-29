"use client";

import type {
  NodeStatus,
  Port,
  SubWorkflowNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface SubWorkflowNodeData {
  label: string;
  config: SubWorkflowNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type SubWorkflowNodeType = Node<SubWorkflowNodeData, "sub_workflow">;

function formatTimeout(timeoutMs: number | undefined): string {
  if (!timeoutMs) {
    return "No limit";
  }
  if (timeoutMs >= 60_000) {
    return `${Math.round(timeoutMs / 60_000)}m`;
  }
  return `${Math.round(timeoutMs / 1000)}s`;
}

export const SubWorkflowNode = memo(
  forwardRef<HTMLDivElement, NodeProps<SubWorkflowNodeType>>(
    function SubWorkflowNodeComponent({ data, selected }, ref) {
      const timeoutDisplay = formatTimeout(data.config.timeoutMs);

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
            icon={<Icons.Workflow size={20} />}
            subtitle="Sub-Workflow"
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField
                label="Workflow"
                mono
                value={`${data.config.workflowId.slice(0, 12)}...`}
              />
              {data.config.version && (
                <NodeField label="Version" mono value={data.config.version} />
              )}
              <NodeField label="Timeout" value={timeoutDisplay} />
              <NodeField
                label="Wait"
                value={data.config.waitForCompletion ? "Yes" : "No"}
              />
              <NodeField
                label="Inherit Context"
                value={data.config.inheritContext ? "Yes" : "No"}
              />
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

SubWorkflowNode.displayName = "SubWorkflowNode";

export function createSubWorkflowNodeData(): SubWorkflowNodeData {
  return {
    label: "Sub-Workflow",
    config: {
      workflowId: "",
      waitForCompletion: true,
      inheritContext: true,
      inputMode: "fields",
      retryOnFailure: false,
      maxRetries: 3,
    },
    inputs: [
      { id: "context", label: "Context", type: "data", required: false },
    ],
    outputs: [
      { id: "result", label: "Result", type: "data", required: true },
      { id: "completed", label: "Completed", type: "control", required: true },
    ],
  };
}
