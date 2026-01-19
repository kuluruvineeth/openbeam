"use client";

import type { LoopNodeConfig, NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Repeat } from "lucide-react";
import { forwardRef, memo, useMemo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface LoopNodeData {
  label: string;
  config: LoopNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type LoopNodeType = Node<LoopNodeData, "loop">;

export const LoopNode = memo(
  forwardRef<HTMLDivElement, NodeProps<LoopNodeType>>(
    function LoopNodeComponent({ data, selected }, ref) {
      const preview = useMemo(() => {
        const { type, collection, condition, times } = data.config;
        switch (type) {
          case "forEach":
            return `For each in ${collection ?? "items"}`;
          case "while":
            return `While ${condition ?? "condition"}`;
          case "times":
            return `Repeat ${times ?? 1} times`;
          default:
            return "Configure loop";
        }
      }, [data.config]);

      return (
        <NodeShell
          handles={[
            {
              id: "input",
              type: "target",
              position: Position.Left,
              offset: "30%",
              label: "In",
            },
            {
              id: "loopBack",
              type: "target",
              position: Position.Left,
              offset: "70%",
              variant: "loop",
              label: "Loop",
            },
            {
              id: "body",
              type: "source",
              position: Position.Right,
              offset: "30%",
              label: "Body",
            },
            {
              id: "done",
              type: "source",
              position: Position.Right,
              offset: "70%",
              variant: "done",
              label: "Done",
            },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-loop"
            icon={<Repeat className="size-5" />}
            subtitle={preview}
            title={data.label}
          />
          <NodeSection>
            <NodeField
              label="Max iterations"
              mono
              value={data.config.maxIterations}
            />
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

LoopNode.displayName = "LoopNode";

export function createLoopNodeData(): LoopNodeData {
  return {
    label: "Loop",
    config: { type: "forEach", maxIterations: 100 },
    inputs: [
      { id: "input", label: "Input", type: "data", required: true },
      { id: "loopBack", label: "Loop Back", type: "control", required: false },
    ],
    outputs: [
      { id: "body", label: "Body", type: "control", required: false },
      { id: "done", label: "Done", type: "control", required: false },
    ],
  };
}
