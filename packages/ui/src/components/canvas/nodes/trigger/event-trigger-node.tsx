"use client";

import type {
  NodeStatus,
  Port,
  TriggerEventNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Zap } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface EventTriggerNodeData {
  label: string;
  config: TriggerEventNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type EventTriggerNodeType = Node<EventTriggerNodeData, "trigger_event">;

const SOURCE_LABELS: Record<string, string> = {
  connector: "Connector",
  system: "System",
  custom: "Custom",
  workflow: "Workflow",
};

export const EventTriggerNode = memo(
  forwardRef<HTMLDivElement, NodeProps<EventTriggerNodeType>>(
    function EventTriggerNodeComponent({ data, selected }, ref) {
      return (
        <NodeShell
          handles={[{ type: "source", position: Position.Right }]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-trigger"
            icon={<Zap className="size-5" />}
            subtitle={SOURCE_LABELS[data.config.eventSource] ?? "System"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField
                label="Event"
                mono
                value={data.config.eventType || "Not configured"}
              />
              {data.config.connectorType && (
                <NodeField
                  label="Connector"
                  value={data.config.connectorType}
                />
              )}
              {data.config.debounceMs && (
                <NodeField
                  label="Debounce"
                  mono
                  value={`${data.config.debounceMs}ms`}
                />
              )}
              {data.config.batchSize && (
                <NodeField
                  label="Batch Size"
                  mono
                  value={data.config.batchSize}
                />
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

EventTriggerNode.displayName = "EventTriggerNode";

export function createEventTriggerNodeData(): EventTriggerNodeData {
  return {
    label: "Event Trigger",
    config: {
      eventType: "",
      eventSource: "system",
    },
    outputs: [{ id: "event", label: "Event", type: "data", required: true }],
  };
}
