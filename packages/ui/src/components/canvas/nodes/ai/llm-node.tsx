"use client";

import { DEFAULT_CHAT_MODEL, getChatModel } from "@openbeam/types/ai";
import type {
  Citation,
  LlmNodeConfig,
  NodeStatus,
  Port,
  TokenUsage,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Icons } from "../../../icons";
import {
  CostIndicator,
  NodeToolbar,
  SourcesCollapsible,
  StreamingResponse,
} from "../../ai-elements";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface LlmNodeData {
  label: string;
  config: LlmNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  isRunning?: boolean;
  streamingContent?: string;
  result?: string;
  tokenUsage?: TokenUsage;
  citations?: Citation[];
  error?: string;
  [key: string]: unknown;
}

type LlmNodeType = Node<LlmNodeData, "llm">;

export interface LlmNodeProps extends NodeProps<LlmNodeType> {
  onRun?: (nodeId: string) => void;
  onStop?: (nodeId: string) => void;
  onCopy?: (content: string) => void;
  onCitationClick?: (citation: Citation) => void;
}

export const LlmNode = memo(
  forwardRef<HTMLDivElement, LlmNodeProps>(function LlmNodeComponent(
    { id, data, selected, onRun, onStop, onCopy, onCitationClick },
    ref
  ) {
    const modelInfo = useMemo(() => {
      const model = getChatModel(data.config.model);
      return {
        name: model?.name ?? data.config.model,
        provider: model?.provider,
      };
    }, [data.config.model]);

    const toolCount = data.config.tools?.length ?? 0;
    const hasContent = Boolean(data.result || data.streamingContent);
    const displayContent = data.streamingContent ?? data.result ?? "";

    const handleRun = useCallback(() => {
      onRun?.(id);
    }, [id, onRun]);

    const handleStop = useCallback(() => {
      onStop?.(id);
    }, [id, onStop]);

    const handleCopy = useCallback(() => {
      if (displayContent) {
        onCopy?.(displayContent);
      }
    }, [displayContent, onCopy]);

    const handleRegenerate = useCallback(() => {
      onRun?.(id);
    }, [id, onRun]);

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
          badge={
            data.isRunning ? (
              <span className="flex items-center gap-1 text-amber-500 text-xs">
                <Icons.Zap className="animate-pulse" size={12} />
                Running
              </span>
            ) : undefined
          }
          colorVar="--node-llm"
          icon={<Icons.Bot size={20} />}
          subtitle={modelInfo.name}
          title={data.label}
        />

        <NodeSection>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <NodeField
                label="Temperature"
                mono
                value={data.config.temperature}
              />
              {data.tokenUsage && (
                <CostIndicator compact usage={data.tokenUsage} />
              )}
            </div>

            {toolCount > 0 && (
              <NodeField label="Tools" mono value={`${toolCount} enabled`} />
            )}

            {data.config.systemPrompt && !hasContent && (
              <p className="truncate text-muted-foreground/70 text-xs">
                {data.config.systemPrompt.slice(0, 50)}...
              </p>
            )}
          </div>
        </NodeSection>

        {(data.isRunning || hasContent) && (
          <NodeSection className="border-border/30 border-t">
            <StreamingResponse
              content={displayContent}
              error={data.error}
              isStreaming={data.isRunning && Boolean(data.streamingContent)}
              onCopy={handleCopy}
              size="sm"
            />
          </NodeSection>
        )}

        {data.citations && data.citations.length > 0 && (
          <NodeSection className="border-border/30 border-t pt-0">
            <SourcesCollapsible
              citations={data.citations}
              compact
              onCitationClick={onCitationClick}
            />
          </NodeSection>
        )}

        {selected && (
          <NodeSection className="border-border/30 border-t py-1">
            <NodeToolbar
              hasContent={hasContent}
              isRunning={data.isRunning}
              onCopy={handleCopy}
              onRegenerate={handleRegenerate}
              onRun={handleRun}
              onStop={handleStop}
              position="inline"
            />
          </NodeSection>
        )}
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
      streaming: true,
    },
    inputs: [{ id: "input", label: "Prompt", type: "data", required: true }],
    outputs: [
      { id: "output", label: "Response", type: "data", required: true },
    ],
  };
}
