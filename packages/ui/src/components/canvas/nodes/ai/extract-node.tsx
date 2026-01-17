"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Scissors } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface ExtractField {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required?: boolean;
}

export interface ExtractNodeConfig {
  fields: ExtractField[];
  schemaName?: string;
  examples?: Array<{ input: string; output: Record<string, unknown> }>;
}

export interface ExtractNodeData {
  label: string;
  config: ExtractNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type ExtractNodeType = Node<ExtractNodeData, "extract">;

export const ExtractNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ExtractNodeType>>(
    function ExtractNodeComponent({ data, selected }, ref) {
      const fieldCount = data.config.fields?.length ?? 0;

      return (
        <div
          className={cn(
            "flex min-w-[200px] flex-col rounded-sm border border-rose-500/50 bg-rose-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-rose-500!"
            position={Position.Left}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-rose-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-rose-500">
              <Scissors className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
          </div>

          <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Fields</span>
              <span className="font-medium text-xs">{fieldCount} defined</span>
            </div>

            {fieldCount > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.config.fields.slice(0, 3).map((field) => (
                  <span
                    className="rounded-sm bg-rose-500/20 px-1.5 py-0.5 text-rose-500 text-xs"
                    key={field.name}
                  >
                    {field.name}
                  </span>
                ))}
                {fieldCount > 3 && (
                  <span className="text-muted-foreground text-xs">
                    +{fieldCount - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-rose-500!"
            position={Position.Right}
            type="source"
          />
        </div>
      );
    }
  )
);
ExtractNode.displayName = "ExtractNode";

export function createExtractNodeData(): ExtractNodeData {
  return {
    label: "Extract",
    config: { fields: [] },
    inputs: [{ id: "content", label: "Content", type: "data", required: true }],
    outputs: [
      { id: "extracted", label: "Extracted", type: "data", required: true },
    ],
  };
}
