"use client";

import type {
  NodeStatus,
  Port,
  StartNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Play } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface StartNodeData {
  label: string;
  config: StartNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type StartNodeType = Node<StartNodeData, "start">;

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual Trigger",
  schedule: "Scheduled",
  webhook: "Webhook",
  event: "Event",
};

export const StartNode = memo(
  forwardRef<HTMLDivElement, NodeProps<StartNodeType>>(
    function StartNodeComponent({ data, selected }, ref) {
      const { triggerType, schedule, webhookPath } = data.config;

      return (
        <NodeShell
          handles={[{ type: "source", position: Position.Right }]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-start"
            icon={<Play className="size-5" />}
            subtitle={TRIGGER_LABELS[triggerType]}
            title={data.label}
          />
          {(schedule || webhookPath) && (
            <NodeSection>
              {triggerType === "schedule" && schedule && (
                <NodeField label="Schedule" mono value={schedule} />
              )}
              {triggerType === "webhook" && webhookPath && (
                <NodeField label="Path" mono value={webhookPath} />
              )}
            </NodeSection>
          )}
        </NodeShell>
      );
    }
  )
);

StartNode.displayName = "StartNode";

export function createStartNodeData(
  triggerType: StartNodeConfig["triggerType"] = "manual"
): StartNodeData {
  return {
    label: "Start",
    config: { triggerType },
    inputs: [],
    outputs: [
      { id: "output", label: "Output", type: "control", required: true },
    ],
  };
}
