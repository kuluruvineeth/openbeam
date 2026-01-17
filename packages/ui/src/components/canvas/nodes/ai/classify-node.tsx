"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Tags } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface ClassifyCategory {
  name: string;
  description?: string;
  examples?: string[];
}

export interface ClassifyNodeConfig {
  categories: ClassifyCategory[];
  multiLabel: boolean;
  confidence: boolean;
  threshold?: number;
}

export interface ClassifyNodeData {
  label: string;
  config: ClassifyNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type ClassifyNodeType = Node<ClassifyNodeData, "classify">;

export const ClassifyNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ClassifyNodeType>>(
    function ClassifyNodeComponent({ data, selected }, ref) {
      const categoryCount = data.config.categories?.length ?? 0;

      return (
        <div
          className={cn(
            "flex min-w-[200px] flex-col rounded-sm border border-pink-500/50 bg-pink-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-pink-500!"
            position={Position.Left}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-pink-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-pink-500">
              <Tags className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
          </div>

          <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Categories</span>
              <span className="font-medium text-xs">{categoryCount}</span>
            </div>

            <div className="flex gap-2">
              {data.config.multiLabel && (
                <span className="rounded-sm bg-pink-500/20 px-1.5 py-0.5 text-pink-500 text-xs">
                  Multi-label
                </span>
              )}
              {data.config.confidence && (
                <span className="rounded-sm bg-pink-500/20 px-1.5 py-0.5 text-pink-500 text-xs">
                  Confidence
                </span>
              )}
            </div>

            {categoryCount > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.config.categories.slice(0, 4).map((cat) => (
                  <span
                    className="rounded-sm bg-muted px-1.5 py-0.5 text-xs"
                    key={cat.name}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-pink-500!"
            position={Position.Right}
            type="source"
          />
        </div>
      );
    }
  )
);
ClassifyNode.displayName = "ClassifyNode";

export function createClassifyNodeData(): ClassifyNodeData {
  return {
    label: "Classify",
    config: { categories: [], multiLabel: false, confidence: true },
    inputs: [{ id: "content", label: "Content", type: "data", required: true }],
    outputs: [
      {
        id: "classification",
        label: "Classification",
        type: "data",
        required: true,
      },
    ],
  };
}
