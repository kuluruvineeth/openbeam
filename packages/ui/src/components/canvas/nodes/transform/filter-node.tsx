"use client";

import type { NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Filter } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface FilterNodeConfig {
  expression: string;
  language: "jmespath" | "jsonata" | "javascript";
}

export interface FilterNodeData {
  label: string;
  config: FilterNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type FilterNodeType = Node<FilterNodeData, "filter">;

const FILTER_LANGUAGE_LABELS: Record<FilterNodeConfig["language"], string> = {
  jmespath: "JMESPath",
  jsonata: "JSONata",
  javascript: "JavaScript",
};

export const FilterNode = memo(
  forwardRef<HTMLDivElement, NodeProps<FilterNodeType>>(
    function FilterNodeComponent({ data, selected }, ref) {
      const expression = data.config.expression ?? "";
      const language = data.config.language ?? "jmespath";
      const hasExpression = expression.length > 0;

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
            icon={<Filter className="size-5" />}
            subtitle={FILTER_LANGUAGE_LABELS[language]}
            title={data.label}
          />
          {hasExpression && (
            <NodeSection>
              <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                {expression.slice(0, 60)}
                {expression.length > 60 && "..."}
              </div>
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
      expression: "",
      language: "jmespath",
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
  };
}
