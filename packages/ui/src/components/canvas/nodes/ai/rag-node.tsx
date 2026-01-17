"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { BookOpen } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface RagNodeConfig {
  searchType: "hybrid" | "semantic" | "keyword";
  topK: number;
  minScore?: number;
  connectorFilter?: string[];
  rerank: boolean;
  synthesize: boolean;
}

export interface RagNodeData {
  label: string;
  config: RagNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type RagNodeType = Node<RagNodeData, "rag">;

export const RagNode = memo(
  forwardRef<HTMLDivElement, NodeProps<RagNodeType>>(function RagNodeComponent(
    { data, selected },
    ref
  ) {
    const searchLabels: Record<string, string> = {
      hybrid: "Hybrid Search",
      semantic: "Semantic Search",
      keyword: "Keyword Search",
    };

    return (
      <div
        className={cn(
          "flex min-w-[220px] flex-col rounded-sm border border-indigo-500/50 bg-indigo-500/5 shadow-sm",
          selected && "ring-2 ring-primary ring-offset-1"
        )}
        ref={ref}
      >
        <Handle
          className="h-3! w-3! border-2! border-background! bg-indigo-500!"
          position={Position.Left}
          type="target"
        />

        <div className="flex items-center gap-2 rounded-t-sm bg-indigo-500/10 px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center text-indigo-500">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Search</span>
            <span className="font-medium text-xs">
              {searchLabels[data.config.searchType]}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Top K</span>
            <span className="text-xs">{data.config.topK}</span>
          </div>

          <div className="flex gap-2">
            {data.config.rerank && (
              <span className="rounded-sm bg-indigo-500/20 px-1.5 py-0.5 text-indigo-500 text-xs">
                Rerank
              </span>
            )}
            {data.config.synthesize && (
              <span className="rounded-sm bg-indigo-500/20 px-1.5 py-0.5 text-indigo-500 text-xs">
                Synthesize
              </span>
            )}
          </div>
        </div>

        <Handle
          className="h-3! w-3! border-2! border-background! bg-indigo-500!"
          id="results"
          position={Position.Right}
          style={{ top: "35%" }}
          type="source"
        />

        <Handle
          className="h-3! w-3! border-2! border-background! bg-violet-500!"
          id="answer"
          position={Position.Right}
          style={{ top: "65%" }}
          type="source"
        />
      </div>
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
      synthesize: true,
    },
    inputs: [{ id: "query", label: "Query", type: "data", required: true }],
    outputs: [
      { id: "results", label: "Results", type: "data", required: false },
      { id: "answer", label: "Answer", type: "data", required: false },
    ],
  };
}
