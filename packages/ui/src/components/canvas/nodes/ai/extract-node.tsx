"use client";

import type {
  ExtractNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Scissors } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ExtractField {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required?: boolean;
}

export interface ExtractNodeData {
  label: string;
  config: ExtractNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ExtractNodeType = Node<ExtractNodeData, "extract">;

export const ExtractNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ExtractNodeType>>(
    function ExtractNodeComponent({ data, selected }, ref) {
      const fields =
        (data.config.schema as { fields?: ExtractField[] })?.fields ?? [];
      const fieldCount = fields.length;

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
            colorVar="--node-extract"
            icon={<Scissors className="size-5" />}
            subtitle={`${fieldCount} fields defined`}
            title={data.label}
          />
          {fieldCount > 0 && (
            <NodeSection>
              <div className="flex flex-wrap gap-1">
                {fields.slice(0, 3).map((field) => (
                  <span
                    className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground text-xs"
                    key={field.name}
                  >
                    {field.name}
                  </span>
                ))}
                {fieldCount > 3 && (
                  <span className="text-muted-foreground text-xs">
                    +{fieldCount - 3}
                  </span>
                )}
              </div>
            </NodeSection>
          )}
        </NodeShell>
      );
    }
  )
);

ExtractNode.displayName = "ExtractNode";

export function createExtractNodeData(): ExtractNodeData {
  return {
    label: "Extract",
    config: { schema: { fields: [] } },
    inputs: [{ id: "content", label: "Content", type: "data", required: true }],
    outputs: [
      { id: "extracted", label: "Extracted", type: "data", required: true },
    ],
  };
}
