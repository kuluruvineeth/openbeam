"use client";

import type {
  ActionItem,
  Citation,
  NodeStatus,
  Port,
  SummarizationStrategy,
  SummarizeExecutionResult,
  SummarizeNodeConfig,
  SummaryFocusArea,
  SummaryOutputFormat,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { cn } from "../../../../utils";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import {
  CostIndicator,
  NodeToolbar,
  SourcesCollapsible,
  StreamingResponse,
} from "../../ai-elements";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface SummarizeNodeData {
  label: string;
  config: SummarizeNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  isRunning?: boolean;
  streamingContent?: string;
  result?: SummarizeExecutionResult;
  error?: string;
  [key: string]: unknown;
}

type SummarizeNodeType = Node<SummarizeNodeData, "summarize">;

export interface SummarizeNodeProps extends NodeProps<SummarizeNodeType> {
  onRun?: (nodeId: string) => void;
  onStop?: (nodeId: string) => void;
  onCopy?: (content: string) => void;
  onCitationClick?: (citation: Citation) => void;
}

const STRATEGY_CONFIG: Record<
  SummarizationStrategy,
  { label: string; icon: typeof Icons.Sparkles; color: string }
> = {
  auto: {
    label: "Auto",
    icon: Icons.Sparkles,
    color: "text-violet-500",
  },
  stuff: {
    label: "Stuff",
    icon: Icons.Zap,
    color: "text-amber-500",
  },
  map_reduce: {
    label: "Map-Reduce",
    icon: Icons.GitBranch,
    color: "text-blue-500",
  },
  refine: {
    label: "Refine",
    icon: Icons.RefreshCw,
    color: "text-emerald-500",
  },
};

const FORMAT_LABELS: Record<SummaryOutputFormat, string> = {
  paragraph: "Paragraph",
  bullets: "Bullets",
  executive: "Executive",
  key_points: "Key Points",
  action_items: "Actions",
  timeline: "Timeline",
  qa_pairs: "Q&A",
};

const LENGTH_LABELS: Record<string, string> = {
  brief: "Brief",
  standard: "Standard",
  detailed: "Detailed",
  custom: "Custom",
};

function FocusAreaBadges({ areas }: { areas: SummaryFocusArea[] }) {
  if (areas.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {areas.slice(0, 3).map((area) => (
        <Badge
          className="px-1.5 py-0 text-[10px]"
          key={area}
          variant="secondary"
        >
          {area.replace("_", " ")}
        </Badge>
      ))}
      {areas.length > 3 && (
        <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
          +{areas.length - 3}
        </Badge>
      )}
    </div>
  );
}

function KeyPointsList({ points }: { points: string[] }) {
  return (
    <NodeSection className="border-border/30 border-t">
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Key Points</span>
        <ul className="list-inside list-disc space-y-0.5 text-xs">
          {points.slice(0, 3).map((point) => (
            <li className="truncate text-foreground/80" key={point}>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </NodeSection>
  );
}

function ActionItemsList({ items }: { items: ActionItem[] }) {
  return (
    <NodeSection className="border-border/30 border-t">
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Actions</span>
        <ul className="space-y-0.5 text-xs">
          {items.slice(0, 3).map((item) => (
            <li
              className="flex items-center gap-1.5 text-foreground/80"
              key={item.task}
            >
              <Icons.CheckSquare className="size-3 shrink-0 text-primary" />
              <span className="truncate">{item.task}</span>
            </li>
          ))}
        </ul>
      </div>
    </NodeSection>
  );
}

interface CitationsListProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

function CitationsList({ citations, onCitationClick }: CitationsListProps) {
  return (
    <NodeSection className="border-border/30 border-t pt-0">
      <SourcesCollapsible
        citations={citations}
        compact
        onCitationClick={onCitationClick}
      />
    </NodeSection>
  );
}

interface StreamingContentProps {
  content: string;
  error?: string;
  isRunning?: boolean;
  streamingContent?: string;
  onCopy: () => void;
}

function StreamingContent({
  content,
  error,
  isRunning,
  streamingContent,
  onCopy,
}: StreamingContentProps) {
  return (
    <NodeSection className="border-border/30 border-t">
      <StreamingResponse
        content={content}
        error={error}
        isStreaming={isRunning && Boolean(streamingContent)}
        onCopy={onCopy}
        size="sm"
      />
    </NodeSection>
  );
}

interface StrategyBadgeProps {
  isRunning?: boolean;
  strategy: SummarizationStrategy;
}

function StrategyBadge({ isRunning, strategy }: StrategyBadgeProps) {
  if (isRunning) {
    return (
      <span className="flex items-center gap-1 text-amber-500 text-xs">
        <Icons.Zap className="animate-pulse" size={12} />
        Running
      </span>
    );
  }
  const strategyInfo = STRATEGY_CONFIG[strategy];
  const StrategyIcon = strategyInfo.icon;
  return (
    <span className={cn("flex items-center gap-1 text-xs", strategyInfo.color)}>
      <StrategyIcon size={12} />
      {strategyInfo.label}
    </span>
  );
}

export const SummarizeNode = memo(
  forwardRef<HTMLDivElement, SummarizeNodeProps>(
    function SummarizeNodeComponent(
      { id, data, selected, onRun, onStop, onCopy, onCitationClick },
      ref
    ) {
      const strategy = data.config.strategy ?? "auto";
      const format = data.config.outputFormat ?? "paragraph";
      const length = data.config.length ?? "standard";
      const focusAreas = data.config.focusAreas ?? [];

      const hasContent = Boolean(data.result?.summary || data.streamingContent);
      const displayContent =
        data.streamingContent ?? data.result?.summary ?? "";

      const tokenUsage = useMemo(() => {
        if (!data.result?.usage) {
          return;
        }
        return {
          input: data.result.usage.inputTokens,
          output: data.result.usage.outputTokens,
          total: data.result.usage.inputTokens + data.result.usage.outputTokens,
          estimatedCost: 0,
        };
      }, [data.result?.usage]);

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
              <StrategyBadge isRunning={data.isRunning} strategy={strategy} />
            }
            colorVar="--node-summarize"
            icon={<Icons.FileText size={20} />}
            subtitle={`${FORMAT_LABELS[format]} · ${LENGTH_LABELS[length]}`}
            title={data.label}
          />

          <NodeSection>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <NodeField
                  label="Model"
                  value={data.config.model ?? "Default"}
                />
                {tokenUsage && <CostIndicator compact usage={tokenUsage} />}
              </div>

              <FocusAreaBadges areas={focusAreas} />

              {data.config.customInstructions && !hasContent && (
                <p className="truncate text-muted-foreground/70 text-xs">
                  {data.config.customInstructions.slice(0, 50)}...
                </p>
              )}
            </div>
          </NodeSection>

          {(data.isRunning || hasContent) && (
            <StreamingContent
              content={displayContent}
              error={data.error}
              isRunning={data.isRunning}
              onCopy={handleCopy}
              streamingContent={data.streamingContent}
            />
          )}

          {data.result?.keyPoints && data.result.keyPoints.length > 0 && (
            <KeyPointsList points={data.result.keyPoints} />
          )}

          {data.result?.actionItems && data.result.actionItems.length > 0 && (
            <ActionItemsList items={data.result.actionItems} />
          )}

          {data.result?.citations && data.result.citations.length > 0 && (
            <CitationsList
              citations={data.result.citations}
              onCitationClick={onCitationClick}
            />
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
    }
  )
);

SummarizeNode.displayName = "SummarizeNode";

export function createSummarizeNodeData(): SummarizeNodeData {
  return {
    label: "Summarize",
    config: {
      strategy: "auto",
      outputFormat: "paragraph",
      length: "standard",
      temperature: 0.3,
      extractEntities: false,
      preserveStructure: false,
      includeCitations: false,
      citationStyle: "inline",
      chunkSize: 1000,
      chunkOverlap: 100,
    },
    inputs: [{ id: "content", label: "Content", type: "data", required: true }],
    outputs: [
      { id: "summary", label: "Summary", type: "data", required: true },
    ],
  };
}
