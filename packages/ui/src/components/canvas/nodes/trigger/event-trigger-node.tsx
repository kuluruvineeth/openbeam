"use client";

import type {
  NodeStatus,
  Port,
  TriggerEventNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
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
      const eventType = data.config.eventType?.trim() ?? "";
      const eventSource = data.config.eventSource ?? "system";
      const connectorType = data.config.connectorType?.trim() ?? "";
      const batchSize = data.config.batchSize;
      const batchWindowMs = data.config.batchWindowMs;
      const debounceMs = data.config.debounceMs;
      const filter = data.config.filter ?? {};
      const filterCount = Object.keys(filter).length;

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!eventType) {
          list.push("Event type required");
        }
        if (eventSource === "connector" && !connectorType) {
          list.push("Connector type required");
        }
        if (batchSize !== undefined && batchSize <= 0) {
          list.push("Batch size must be at least 1");
        }
        if (batchWindowMs !== undefined && batchWindowMs <= 0) {
          list.push("Batch window must be positive");
        }
        if (debounceMs !== undefined && debounceMs <= 0) {
          list.push("Debounce must be positive");
        }
        if (batchSize && !batchWindowMs) {
          list.push("Batch window required when batch size is set");
        }
        return list;
      }, [
        batchSize,
        batchWindowMs,
        connectorType,
        debounceMs,
        eventSource,
        eventType,
      ]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (filterCount > 0) {
          list.push(
            `${filterCount} filter${filterCount > 1 ? "s" : ""} applied`
          );
        }
        if (debounceMs) {
          list.push(`Debounce ${debounceMs}ms`);
        }
        if (batchSize && batchWindowMs) {
          list.push(`Batch ${batchSize} / ${batchWindowMs}ms`);
        }
        return list;
      }, [batchSize, batchWindowMs, debounceMs, filterCount]);

      return (
        <NodeShell
          handles={[{ type: "source", position: Position.Right }]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-trigger"
            icon={<Icons.Zap size={20} />}
            subtitle={SOURCE_LABELS[eventSource] ?? "System"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField
                label="Event"
                mono
                value={eventType || "Not configured"}
              />
              {connectorType && (
                <NodeField label="Connector" value={connectorType} />
              )}
              {debounceMs && (
                <NodeField label="Debounce" mono value={`${debounceMs}ms`} />
              )}
              {batchSize && (
                <NodeField label="Batch Size" mono value={batchSize} />
              )}
              {batchWindowMs && (
                <NodeField
                  label="Batch Window"
                  mono
                  value={`${batchWindowMs}ms`}
                />
              )}
              {filterCount > 0 && (
                <NodeField label="Filters" mono value={`${filterCount}`} />
              )}
              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((warning) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-warning"
                      key={warning}
                    >
                      <Icons.AlertCircle size={12} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
              {notes.length > 0 && (
                <div className="space-y-1">
                  {notes.map((note) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      key={note}
                    >
                      <Icons.Info size={12} />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
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
