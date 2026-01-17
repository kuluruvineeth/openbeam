"use client";

import type { NodeCategory } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";
import { forwardRef, memo } from "react";
import { cn } from "../../../utils";

export interface NodePortDefinition {
  id: string;
  label: string;
  type: "data" | "control";
  required: boolean;
}

export interface BaseNodeData {
  label: string;
  description?: string;
  inputs?: NodePortDefinition[];
  outputs?: NodePortDefinition[];
  config?: Record<string, unknown>;
  validation?: {
    isValid: boolean;
    errors?: string[];
  };
  [key: string]: unknown;
}

type BaseNodeType = Node<BaseNodeData, string>;

interface BaseNodeProps extends NodeProps<BaseNodeType> {
  category: NodeCategory;
  icon: ReactNode;
  color: string;
  children?: ReactNode;
}

const categoryStyles: Record<NodeCategory, string> = {
  control: "border-blue-500/50 bg-blue-500/5",
  ai: "border-purple-500/50 bg-purple-500/5",
  transform: "border-orange-500/50 bg-orange-500/5",
  integration: "border-green-500/50 bg-green-500/5",
  human: "border-pink-500/50 bg-pink-500/5",
};

export const BaseNode = memo(
  forwardRef<HTMLDivElement, BaseNodeProps>(function BaseNodeComponent(
    { data, selected, category, icon, color, children },
    ref
  ) {
    const hasInputs = data.inputs && data.inputs.length > 0;
    const hasOutputs = data.outputs && data.outputs.length > 0;
    const isInvalid = data.validation && !data.validation.isValid;

    return (
      <div
        className={cn(
          "min-w-[200px] rounded-sm border shadow-sm transition-all",
          categoryStyles[category],
          selected && "ring-2 ring-primary ring-offset-1",
          isInvalid && "ring-2 ring-destructive ring-offset-1"
        )}
        ref={ref}
      >
        <div
          className="flex items-center gap-2 rounded-t-sm px-3 py-2"
          style={{ backgroundColor: `${color}15` }}
        >
          <div
            className="flex h-6 w-6 items-center justify-center"
            style={{ color }}
          >
            {icon}
          </div>
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        {children && (
          <div className="border-border/50 border-t p-3">{children}</div>
        )}

        {hasInputs &&
          data.inputs?.map((input, index) => (
            <Handle
              className="h-3! w-3! border-2! border-background! bg-muted-foreground!"
              id={input.id}
              key={input.id}
              position={Position.Left}
              style={{
                top: `${((index + 1) / ((data.inputs?.length ?? 0) + 1)) * 100}%`,
              }}
              type="target"
            />
          ))}

        {hasOutputs &&
          data.outputs?.map((output, index) => (
            <Handle
              className="h-3! w-3! border-2! border-background! bg-muted-foreground!"
              id={output.id}
              key={output.id}
              position={Position.Right}
              style={{
                top: `${((index + 1) / ((data.outputs?.length ?? 0) + 1)) * 100}%`,
              }}
              type="source"
            />
          ))}
      </div>
    );
  })
);
BaseNode.displayName = "BaseNode";
