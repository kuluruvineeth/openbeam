"use client";

import type { Node, NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";
import { forwardRef, memo } from "react";
import { cn } from "../../../utils";
import { NodeLayout } from "./node-layout";

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
  icon: ReactNode;
  children?: ReactNode;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
}

export const BaseNode = memo(
  forwardRef<HTMLDivElement, BaseNodeProps>(function BaseNodeComponent(
    {
      id,
      data,
      icon,
      children,
      showSourceHandle = true,
      showTargetHandle = true,
    },
    ref
  ) {
    const isInvalid = data.validation && !data.validation.isValid;

    return (
      <NodeLayout
        className={cn(isInvalid && "ring-2 ring-destructive")}
        id={id}
        ref={ref}
        showSourceHandle={showSourceHandle}
        showTargetHandle={showTargetHandle}
        title={data.label}
      >
        <div className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{data.label}</p>
            {data.description && (
              <p className="truncate text-muted-foreground text-xs">
                {data.description}
              </p>
            )}
          </div>
        </div>
        {children && (
          <div className="border-border/50 border-t px-4 py-3">{children}</div>
        )}
      </NodeLayout>
    );
  })
);
BaseNode.displayName = "BaseNode";
