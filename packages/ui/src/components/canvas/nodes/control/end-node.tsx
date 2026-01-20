"use client";

import type { EndNodeConfig, NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Square } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeHeader, NodeShell } from "../primitives";

export interface EndNodeData {
  label: string;
  config: EndNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type EndNodeType = Node<EndNodeData, "end">;

const OUTPUT_LABELS: Record<string, string> = {
  result: "Return Result",
  notification: "Send Notification",
  webhook: "Call Webhook",
  none: "No Output",
};

export const EndNode = memo(
  forwardRef<HTMLDivElement, NodeProps<EndNodeType>>(function EndNodeComponent(
    { data, selected },
    ref
  ) {
    return (
      <NodeShell
        handles={[{ type: "target", position: Position.Left }]}
        ref={ref}
        selected={selected}
        status={data.status}
      >
        <NodeHeader
          colorVar="--node-end"
          icon={<Square className="size-5" />}
          subtitle={OUTPUT_LABELS[data.config.outputType]}
          title={data.label}
        />
      </NodeShell>
    );
  })
);

EndNode.displayName = "EndNode";

export function createEndNodeData(
  outputType: EndNodeConfig["outputType"] = "result"
): EndNodeData {
  return {
    label: "End",
    config: { outputType },
    inputs: [{ id: "input", label: "Input", type: "control", required: true }],
    outputs: [],
  };
}
