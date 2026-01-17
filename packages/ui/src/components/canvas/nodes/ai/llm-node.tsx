"use client";

import { DEFAULT_CHAT_MODEL, getChatModel } from "@openplane/types/ai";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Bot } from "lucide-react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface LlmNodeConfig {
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  responseFormat?: "text" | "json" | "structured";
}

export interface LlmNodeData {
  label: string;
  config: LlmNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type LlmNodeType = Node<LlmNodeData, "llm">;

export const LlmNode = memo(
  forwardRef<HTMLDivElement, NodeProps<LlmNodeType>>(function LlmNodeComponent(
    { data, selected },
    ref
  ) {
    const modelLabel = useMemo(() => {
      const model = getChatModel(data.config.model);
      return model?.name ?? data.config.model;
    }, [data.config.model]);
    const hasTools = data.config.tools && data.config.tools.length > 0;

    return (
      <div
        className={cn(
          "flex min-w-[220px] flex-col rounded-sm border border-violet-500/50 bg-violet-500/5 shadow-sm",
          selected && "ring-2 ring-primary ring-offset-1"
        )}
        ref={ref}
      >
        <Handle
          className="h-3! w-3! border-2! border-background! bg-violet-500!"
          position={Position.Left}
          type="target"
        />

        <div className="flex items-center gap-2 rounded-t-sm bg-violet-500/10 px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center text-violet-500">
            <Bot className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm">{data.label}</span>
        </div>

        <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Model</span>
            <span className="font-medium text-xs">{modelLabel}</span>
          </div>

          {data.config.temperature !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Temperature</span>
              <span className="text-xs">{data.config.temperature}</span>
            </div>
          )}

          {hasTools && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Tools</span>
              <span className="text-xs">
                {data.config.tools?.length} enabled
              </span>
            </div>
          )}

          {data.config.systemPrompt && (
            <div className="mt-2 truncate text-muted-foreground/70 text-xs">
              {data.config.systemPrompt.slice(0, 50)}...
            </div>
          )}
        </div>

        <Handle
          className="h-3! w-3! border-2! border-background! bg-violet-500!"
          position={Position.Right}
          type="source"
        />
      </div>
    );
  })
);
LlmNode.displayName = "LlmNode";

export function createLlmNodeData(): LlmNodeData {
  return {
    label: "LLM",
    config: {
      model: DEFAULT_CHAT_MODEL,
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: "text",
    },
    inputs: [{ id: "input", label: "Prompt", type: "data", required: true }],
    outputs: [
      { id: "output", label: "Response", type: "data", required: true },
    ],
  };
}
