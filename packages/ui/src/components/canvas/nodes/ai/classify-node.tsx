"use client";

import type {
  ClassifyNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ClassifyCategory {
  name: string;
  description?: string;
  examples?: string[];
}

export interface ClassifyNodeData {
  label: string;
  config: ClassifyNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ClassifyNodeType = Node<ClassifyNodeData, "classify">;

export const ClassifyNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ClassifyNodeType>>(
    function ClassifyNodeComponent({ data, selected }, ref) {
      const categories = data.config.categories ?? [];
      const categoryCount = categories.length;

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
            colorVar="--node-classify"
            icon={<Icons.Tags size={20} />}
            subtitle={`${categoryCount} categories`}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {data.config.allowMultiple && (
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                    Multi-label
                  </span>
                )}
              </div>
              {categoryCount > 0 && (
                <div className="flex flex-wrap gap-1">
                  {categories.slice(0, 4).map((cat) => (
                    <span
                      className="rounded-sm bg-muted/50 px-2 py-0.5 text-xs"
                      key={cat.name}
                    >
                      {cat.name}
                    </span>
                  ))}
                  {categoryCount > 4 && (
                    <span className="text-muted-foreground text-xs">
                      +{categoryCount - 4}
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

ClassifyNode.displayName = "ClassifyNode";

export function createClassifyNodeData(): ClassifyNodeData {
  return {
    label: "Classify",
    config: { categories: [], allowMultiple: false },
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
