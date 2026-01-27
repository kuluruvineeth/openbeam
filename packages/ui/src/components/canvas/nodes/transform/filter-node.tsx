"use client";

import type {
  FilterNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface FilterNodeData {
  label: string;
  config: FilterNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type FilterNodeType = Node<FilterNodeData, "filter">;

function getFilterSummary(config: FilterNodeConfig): string {
  const mode = config.mode ?? "visual";

  if (mode === "expression") {
    const expr = config.expression ?? "";
    if (!expr) {
      return "No expression";
    }
    return expr.length > 50 ? `${expr.slice(0, 50)}...` : expr;
  }

  const conditions = config.conditions ?? [];
  if (conditions.length === 0) {
    return "No conditions";
  }
  const logic = (config.logic ?? "and").toUpperCase();
  return `${conditions.length} condition${conditions.length !== 1 ? "s" : ""} \u00B7 ${logic}`;
}

function getFilterSubtitle(config: FilterNodeConfig): string {
  const mode = config.mode ?? "visual";
  return mode === "visual" ? "Visual" : "Expression";
}

export const FilterNode = memo(
  forwardRef<HTMLDivElement, NodeProps<FilterNodeType>>(
    function FilterNodeComponent({ data, selected }, ref) {
      const summary = getFilterSummary(data.config);
      const subtitle = getFilterSubtitle(data.config);
      const mode = data.config.mode ?? "visual";
      const conditions = data.config.conditions ?? [];
      const hasContent =
        mode === "visual"
          ? conditions.length > 0
          : (data.config.expression ?? "").length > 0;

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
            colorVar="--node-filter"
            icon={<Icons.Filter size={20} />}
            subtitle={subtitle}
            title={data.label}
          />
          {hasContent && (
            <NodeSection>
              {mode === "visual" ? (
                <NodeField label="Conditions" value={summary} />
              ) : (
                <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                  {summary}
                </div>
              )}
            </NodeSection>
          )}
        </NodeShell>
      );
    }
  )
);

FilterNode.displayName = "FilterNode";

export function createFilterNodeData(): FilterNodeData {
  return {
    label: "Filter",
    config: {
      mode: "visual",
      logic: "and",
      conditions: [],
      expression: "",
      language: "javascript",
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
  };
}
