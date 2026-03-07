"use client";

import type {
  NodeStatus,
  Port,
  TriggerScheduleNodeConfig,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
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
      const cron = data.config.cron?.trim() ?? "";
      const timezone = data.config.timezone?.trim() ?? "";
      const enabled = data.config.enabled ?? true;
      const startDate = data.config.startDate;
      const endDate = data.config.endDate;
      const maxRuns = data.config.maxRuns;

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!cron) {
          list.push("Cron is required");
        }
        if (!timezone) {
          list.push("Timezone is required");
        }
        if (startDate && endDate) {
          const start = Date.parse(startDate);
          const end = Date.parse(endDate);
          if (!(Number.isNaN(start) || Number.isNaN(end)) && start > end) {
            list.push("Start date must be before end date");
          }
        }
        if (maxRuns !== undefined && maxRuns <= 0) {
          list.push("Max runs must be at least 1");
        }
        return list;
      }, [cron, endDate, maxRuns, startDate, timezone]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (!enabled) {
          list.push("Schedule is disabled");
        }
        if (data.config.runOnStart) {
          list.push("Runs immediately on activation");
        }
        if (data.config.catchUpMissed) {
          list.push("Catches up missed runs");
        }
        if (startDate) {
          list.push(`Starts on ${startDate}`);
        }
        if (endDate) {
          list.push(`Ends on ${endDate}`);
        }
        if (maxRuns !== undefined) {
          list.push(`Max runs: ${maxRuns}`);
        }
        return list;
      }, [
        data.config.catchUpMissed,
        data.config.runOnStart,
        endDate,
        enabled,
        maxRuns,
        startDate,
      ]);

      return (
        <NodeShell
          handles={[{ type: "source", position: Position.Right }]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-trigger"
            icon={<Icons.Clock size={20} />}
            subtitle={enabled ? "Active" : "Disabled"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField label="Cron" mono value={cron || "Not set"} />
              <NodeField label="Timezone" value={timezone || "Not set"} />
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
