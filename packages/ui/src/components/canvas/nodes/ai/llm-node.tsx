"use client";

import { DEFAULT_CHAT_MODEL, getChatModel } from "@openplane/types/ai";
import type { LlmNodeConfig, NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Bot } from "lucide-react";
import { forwardRef, memo, useMemo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface LlmNodeData {
  label: string;
  config: LlmNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
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

    const toolCount = data.config.tools?.length ?? 0;

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
          colorVar="--node-llm"
          icon={<Bot className="size-5" />}
          subtitle={modelLabel}
          title={data.label}
        />
        <NodeSection>
          <div className="space-y-1">
            <NodeField
              label="Temperature"
              mono
              value={data.config.temperature}
            />
            {toolCount > 0 && (
              <NodeField label="Tools" mono value={`${toolCount} enabled`} />
            )}
            {data.config.systemPrompt && (
              <p className="truncate text-muted-foreground/70 text-xs">
                {data.config.systemPrompt.slice(0, 50)}...
              </p>
            )}
          </div>
        </NodeSection>
      </NodeShell>
    );
  })
);

LlmNode.displayName = "LlmNode";

export function createLlmNodeData(): LlmNodeData {
  return {
    label: "LLM",
    config: {
      model: DEFAULT_CHAT_MODEL,
      systemPrompt: "",
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
