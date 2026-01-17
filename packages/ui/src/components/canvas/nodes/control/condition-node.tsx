"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface ConditionNodeConfig {
  conditionType: "expression" | "llm" | "contains" | "equals";
  expression?: string;
  field?: string;
  value?: string;
}

export interface ConditionNodeData {
  label: string;
  config: ConditionNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type ConditionNodeType = Node<ConditionNodeData, "condition">;

export const ConditionNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ConditionNodeType>>(
    function ConditionNodeComponent({ data, selected }, ref) {
      const conditionPreview = (): string => {
        switch (data.config.conditionType) {
          case "expression":
            return data.config.expression ?? "No expression";
          case "llm":
            return "LLM decides";
          case "contains":
            return `${data.config.field ?? "field"} contains "${data.config.value ?? ""}"`;
          case "equals":
            return `${data.config.field ?? "field"} = "${data.config.value ?? ""}"`;
          default:
            return "Configure condition";
        }
      };

      return (
        <div
          className={cn(
            "relative flex min-w-[200px] flex-col rounded-sm border border-amber-500/50 bg-amber-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-amber-500!"
            position={Position.Left}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-amber-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-amber-500">
              <GitBranch className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
          </div>

          <div className="border-border/50 border-t px-3 py-2">
            <div className="truncate text-muted-foreground text-xs">
              {conditionPreview()}
            </div>
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-green-500!"
            id="true"
            position={Position.Right}
            style={{ top: "35%" }}
            type="source"
          />
          <div
            className="absolute right-[-24px] text-green-500 text-xs"
            style={{ top: "32%" }}
          >
            Yes
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-red-500!"
            id="false"
            position={Position.Right}
            style={{ top: "65%" }}
            type="source"
          />
          <div
            className="absolute right-[-20px] text-red-500 text-xs"
            style={{ top: "62%" }}
          >
            No
          </div>
        </div>
      );
    }
  )
);
ConditionNode.displayName = "ConditionNode";

export function createConditionNodeData(): ConditionNodeData {
  return {
    label: "Condition",
    config: { conditionType: "expression" },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [
      { id: "true", label: "True", type: "control", required: false },
      { id: "false", label: "False", type: "control", required: false },
    ],
  };
}
