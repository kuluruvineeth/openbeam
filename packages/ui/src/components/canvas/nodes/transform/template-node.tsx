"use client";

import type { NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface TemplateNodeConfig {
  template: string;
  outputFormat: "text" | "json" | "markdown" | "html";
  variables?: string[];
}

export interface TemplateNodeData {
  label: string;
  config: TemplateNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
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
            colorVar="--node-template"
            icon={<Icons.FileText size={20} />}
            subtitle={FORMAT_LABELS[data.config.outputFormat]}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              {hasTemplate && (
                <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                  {templatePreview}
                  {(data.config.template?.length ?? 0) > 60 && "..."}
                </div>
              )}
              {variableCount > 0 && (
                <div className="flex flex-wrap gap-1">
                  {data.config.variables?.slice(0, 4).map((v) => (
                    <span
                      className="rounded-sm bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs"
                      key={v}
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                  {variableCount > 4 && (
                    <span className="text-muted-foreground text-xs">
                      +{variableCount - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
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
