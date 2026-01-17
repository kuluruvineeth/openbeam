"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Filter } from "lucide-react";
import { forwardRef, memo } from "react";
import { BaseNode, type NodePortDefinition } from "../base-node";

export interface FilterNodeConfig extends Record<string, unknown> {
  expression: string;
  language: "jmespath" | "jsonata" | "javascript";
}

export interface FilterNodeData {
  label: string;
  config: FilterNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type FilterNodeType = Node<FilterNodeData, "filter">;

const FILTER_NODE_COLOR = "rgb(249, 115, 22)";
const FILTER_PREVIEW_LIMIT = 60;

const FILTER_LANGUAGE_LABELS: Record<FilterNodeConfig["language"], string> = {
  jmespath: "JMESPath",
  jsonata: "JSONata",
  javascript: "JavaScript",
};

export const FilterNode = memo(
  forwardRef<HTMLDivElement, NodeProps<FilterNodeType>>(
    function FilterNodeComponent(props, ref) {
      const { data } = props;
      const expression = data.config.expression ?? "";
      const language = data.config.language ?? "jmespath";
      const hasExpression = expression.length > 0;
      const expressionPreview = expression.slice(0, FILTER_PREVIEW_LIMIT);

      return (
        <BaseNode
          {...props}
          category="transform"
          color={FILTER_NODE_COLOR}
          icon={<Filter className="h-4 w-4" />}
          ref={ref}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Language</span>
              <span className="font-medium text-xs">
                {FILTER_LANGUAGE_LABELS[language]}
              </span>
            </div>
            {hasExpression && (
              <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                {expressionPreview}
                {expression.length > FILTER_PREVIEW_LIMIT && "..."}
              </div>
            )}
          </div>
        </BaseNode>
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
