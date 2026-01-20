"use client";

import type {
  ConditionNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { forwardRef, memo, useMemo } from "react";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ConditionNodeData {
  label: string;
  config: ConditionNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ConditionNodeType = Node<ConditionNodeData, "condition">;

export const ConditionNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ConditionNodeType>>(
    function ConditionNodeComponent({ data, selected }, ref) {
      const preview = useMemo(() => {
        const { expression, branches, defaultBranch } = data.config;
        if (expression) {
          return expression.length > 40
            ? `${expression.slice(0, 40)}...`
            : expression;
        }
        if (branches?.length) {
          return `${branches.length} branches`;
        }
        return defaultBranch
          ? `Default: ${defaultBranch}`
          : "Configure condition";
      }, [data.config]);

      return (
        <NodeShell
          handles={[
            { type: "target", position: Position.Left },
            {
              id: "true",
              type: "source",
              position: Position.Right,
              offset: "30%",
              variant: "true",
              label: "Yes",
            },
            {
              id: "false",
              type: "source",
              position: Position.Right,
              offset: "70%",
              variant: "false",
              label: "No",
            },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-condition"
            icon={<GitBranch className="size-5" />}
            subtitle="Branch Logic"
            title={data.label}
          />
          <NodeSection>
            <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
              {preview}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ConditionNode.displayName = "ConditionNode";

export function createConditionNodeData(): ConditionNodeData {
  return {
    label: "Condition",
    config: { expression: "", branches: [], defaultBranch: undefined },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [
      { id: "true", label: "True", type: "control", required: false },
      { id: "false", label: "False", type: "control", required: false },
    ],
  };
}
