"use client";

import type {
  NodeStatus,
  Port,
  SummarizeNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface SummarizeNodeData {
  label: string;
  config: SummarizeNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type SummarizeNodeType = Node<SummarizeNodeData, "summarize">;

const STYLE_LABELS: Record<string, string> = {
  bullets: "Bullet Points",
  paragraph: "Paragraph",
  executive: "Executive Summary",
};

export const SummarizeNode = memo(
  forwardRef<HTMLDivElement, NodeProps<SummarizeNodeType>>(
    function SummarizeNodeComponent({ data, selected }, ref) {
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
            colorVar="--node-summarize"
            icon={<Icons.FileText size={20} />}
            subtitle={STYLE_LABELS[data.config.style]}
            title={data.label}
          />
          {data.config.maxLength && (
            <NodeSection>
              <NodeField
                label="Max Length"
                mono
                value={`${data.config.maxLength} words`}
              />
            </NodeSection>
          )}
        </NodeShell>
      );
    }
  )
);

SummarizeNode.displayName = "SummarizeNode";

export function createSummarizeNodeData(): SummarizeNodeData {
  return {
    label: "Summarize",
    config: { style: "paragraph", maxLength: 200 },
    inputs: [{ id: "content", label: "Content", type: "data", required: true }],
    outputs: [
      { id: "summary", label: "Summary", type: "data", required: true },
    ],
  };
}
