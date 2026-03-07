"use client";

import type {
  NodeStatus,
  Port,
  TriggerManualNodeConfig,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
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
      const inputSchema = data.config.inputSchema ?? [];
      const inputCount = inputSchema.length;
      const permissionCount = data.config.requiredPermissions?.length ?? 0;

      const warnings = useMemo(() => {
        const list: string[] = [];
        const names = inputSchema.map((field) => field.name.trim());
        const emptyNames = names.filter((name) => !name).length;
        if (emptyNames > 0) {
          list.push("Input schema has empty field names");
        }
        const uniqueNames = new Set(names.filter(Boolean));
        if (uniqueNames.size !== names.filter(Boolean).length) {
          list.push("Input schema has duplicate field names");
        }
        return list;
      }, [inputSchema]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (inputCount === 0) {
          list.push("No input schema; manual runs accept any payload");
        } else {
          list.push("Input schema defines the manual run form");
        }
        if (permissionCount > 0) {
          list.push(
            `Restricted to ${permissionCount} permission${
              permissionCount > 1 ? "s" : ""
            }`
          );
        } else {
          list.push("Anyone with access can trigger this workflow");
        }
        return list;
      }, [inputCount, permissionCount]);

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
              <NodeField
                label="Inputs"
                mono
                value={inputCount > 0 ? `${inputCount} fields` : "None"}
              />
              <NodeField
                label="Permissions"
                mono
                value={
                  permissionCount > 0 ? `${permissionCount} required` : "Open"
                }
              />
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
