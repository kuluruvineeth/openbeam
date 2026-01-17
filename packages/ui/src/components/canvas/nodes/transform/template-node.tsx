"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { FileText, Variable } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface TemplateNodeConfig {
  template: string;
  outputFormat: "text" | "json" | "markdown" | "html";
  variables?: string[];
}

export interface TemplateNodeData {
  label: string;
  config: TemplateNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  preview?: string;
  [key: string]: unknown;
}

type TemplateNodeType = Node<TemplateNodeData, "template">;

const FORMAT_LABELS: Record<string, string> = {
  text: "Plain Text",
  json: "JSON",
  markdown: "Markdown",
  html: "HTML",
};

export const TemplateNode = memo(
  forwardRef<HTMLDivElement, NodeProps<TemplateNodeType>>(
    function TemplateNodeComponent({ data, selected }, ref) {
      const variableCount = data.config.variables?.length ?? 0;
      const templatePreview = data.config.template?.slice(0, 60) ?? "";
      const hasTemplate = (data.config.template?.length ?? 0) > 0;

      return (
        <div
          className={cn(
            "flex min-w-[200px] flex-col rounded-sm border border-teal-500/50 bg-teal-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-teal-500!"
            position={Position.Left}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-teal-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-teal-500">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
          </div>

          <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Format</span>
              <span className="font-medium text-xs">
                {FORMAT_LABELS[data.config.outputFormat]}
              </span>
            </div>

            {variableCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Variables</span>
                <div className="flex items-center gap-1">
                  <Variable className="h-3 w-3 text-teal-500" />
                  <span className="text-xs">{variableCount}</span>
                </div>
              </div>
            )}

            {hasTemplate && (
              <div className="mt-2 rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                {templatePreview}
                {(data.config.template?.length ?? 0) > 60 && "..."}
              </div>
            )}

            {variableCount > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {data.config.variables?.slice(0, 4).map((v) => (
                  <span
                    className="rounded-sm bg-teal-500/20 px-1.5 py-0.5 text-teal-500 text-xs"
                    key={v}
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
                {variableCount > 4 && (
                  <span className="text-muted-foreground text-xs">
                    +{variableCount - 4} more
                  </span>
                )}
              </div>
            )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-teal-500!"
            position={Position.Right}
            type="source"
          />
        </div>
      );
    }
  )
);
TemplateNode.displayName = "TemplateNode";

export function createTemplateNodeData(): TemplateNodeData {
  return {
    label: "Template",
    config: {
      template: "",
      outputFormat: "text",
      variables: [],
    },
    inputs: [
      { id: "variables", label: "Variables", type: "data", required: true },
    ],
    outputs: [{ id: "output", label: "Output", type: "data", required: true }],
  };
}
