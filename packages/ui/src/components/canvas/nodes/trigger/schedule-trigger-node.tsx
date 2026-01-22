"use client";

import type {
  NodeStatus,
  Port,
  TriggerScheduleNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Clock } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ScheduleTriggerNodeData {
  label: string;
  config: TriggerScheduleNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ScheduleTriggerNodeType = Node<
  ScheduleTriggerNodeData,
  "trigger_schedule"
>;

export const ScheduleTriggerNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ScheduleTriggerNodeType>>(
    function ScheduleTriggerNodeComponent({ data, selected }, ref) {
      return (
        <NodeShell
          handles={[{ type: "source", position: Position.Right }]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-trigger"
            icon={<Clock className="size-5" />}
            subtitle={data.config.enabled ? "Active" : "Disabled"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField
                label="Cron"
                mono
                value={data.config.cron || "Not set"}
              />
              <NodeField label="Timezone" value={data.config.timezone} />
              {data.config.catchUpMissed && (
                <p className="text-muted-foreground text-xs">
                  Will catch up missed runs
                </p>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ScheduleTriggerNode.displayName = "ScheduleTriggerNode";

export function createScheduleTriggerNodeData(): ScheduleTriggerNodeData {
  return {
    label: "Schedule Trigger",
    config: {
      cron: "0 * * * *",
      timezone: "UTC",
      enabled: true,
      runOnStart: false,
      catchUpMissed: false,
    },
    outputs: [
      { id: "trigger", label: "Trigger", type: "control", required: true },
    ],
  };
}
