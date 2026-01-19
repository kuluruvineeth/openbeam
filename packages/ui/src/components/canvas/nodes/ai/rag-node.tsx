"use client";

import type { NodeStatus, Port, RagNodeConfig } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { BookOpen } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface RagNodeData {
  label: string;
  config: RagNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type RagNodeType = Node<RagNodeData, "rag">;

const SEARCH_LABELS: Record<string, string> = {
  hybrid: "Hybrid Search",
  semantic: "Semantic Search",
  keyword: "Keyword Search",
};

export const RagNode = memo(
  forwardRef<HTMLDivElement, NodeProps<RagNodeType>>(function RagNodeComponent(
    { data, selected },
    ref
  ) {
    return (
      <NodeShell
        handles={[
          { type: "target", position: Position.Left },
          {
            id: "results",
            type: "source",
            position: Position.Right,
            offset: "35%",
          },
          {
            id: "answer",
            type: "source",
            position: Position.Right,
            offset: "65%",
          },
        ]}
        ref={ref}
        selected={selected}
        status={data.status}
      >
        <NodeHeader
          colorVar="--node-rag"
          icon={<BookOpen className="size-5" />}
          subtitle={SEARCH_LABELS[data.config.searchType]}
          title={data.label}
        />
        <NodeSection>
          <div className="space-y-1.5">
            <NodeField label="Top K" mono value={data.config.topK} />
            {data.config.minScore !== undefined && (
              <NodeField label="Min Score" mono value={data.config.minScore} />
            )}
            <div className="flex flex-wrap gap-1.5">
              {data.config.rerank && (
                <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                  Rerank
                </span>
              )}
            </div>
          </div>
        </NodeSection>
      </NodeShell>
    );
  })
);

RagNode.displayName = "RagNode";

export function createRagNodeData(): RagNodeData {
  return {
    label: "RAG",
    config: {
      searchType: "hybrid",
      topK: 10,
      minScore: 0.5,
      rerank: true,
    },
    inputs: [{ id: "query", label: "Query", type: "data", required: true }],
    outputs: [
      { id: "results", label: "Results", type: "data", required: false },
      { id: "answer", label: "Answer", type: "data", required: false },
    ],
  };
}
