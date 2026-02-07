"use client";

import type {
  NodeStatus,
  Port,
  RagExecutionResult,
  RagNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";
import { RagExecutionStatus, type RagExecutionStep } from "../../ai-elements";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface RagNodeData {
  label: string;
  config: RagNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  executionStep?: RagExecutionStep;
  executionResult?: RagExecutionResult;
  [key: string]: unknown;
}

type RagNodeType = Node<RagNodeData, "rag">;

const SEARCH_ICONS: Record<string, typeof Icons.Search> = {
  hybrid: Icons.Sparkles,
  semantic: Icons.BrainCircuit,
  keyword: Icons.Search,
};

const SEARCH_LABELS: Record<string, string> = {
  hybrid: "Hybrid",
  semantic: "Semantic",
  keyword: "Keyword",
};

const SOURCE_ICONS: Record<string, typeof Icons.Database> = {
  slack: Icons.MessageSquare,
  notion: Icons.BookOpen,
  "google-drive": Icons.Folder,
  google_drive: Icons.Folder,
  gmail: Icons.Mail,
  linear: Icons.Layers,
  github: Icons.GitBranch,
};

interface FeatureBadge {
  id: string;
  label: string;
  icon: typeof Icons.Check;
}

function getFeatureBadges(config: RagNodeConfig): FeatureBadge[] {
  const badges: FeatureBadge[] = [];

  if (config.rerank) {
    badges.push({ id: "rerank", label: "Rerank", icon: Icons.Layers });
  }

  if (config.synthesize !== false) {
    badges.push({ id: "synthesize", label: "Synth", icon: Icons.Sparkles });
  } else {
    badges.push({ id: "context", label: "Context", icon: Icons.FileText });
  }

  if (config.citationStyle && config.citationStyle !== "none") {
    badges.push({ id: "cite", label: "Cite", icon: Icons.Text });
  }

  if (config.deduplicate) {
    badges.push({ id: "dedupe", label: "Dedupe", icon: Icons.Filter });
  }

  if (config.queryExpansion) {
    badges.push({ id: "expand", label: "Expand", icon: Icons.Wand });
  }

  return badges;
}

export const RagNode = memo(
  forwardRef<HTMLDivElement, NodeProps<RagNodeType>>(function RagNodeComponent(
    { data, selected },
    ref
  ) {
    const featureBadges = useMemo(
      () => getFeatureBadges(data.config),
      [data.config]
    );

    const SearchIcon = SEARCH_ICONS[data.config.searchType] ?? Icons.Search;
    const hasResults = !!data.executionResult;
    const chunksCount = data.executionResult?.chunks.length ?? 0;
    const citationsCount = data.executionResult?.citations.length ?? 0;
    const topK = data.config.topK ?? 10;
    const minScore = data.config.minScore ?? 0.5;

    return (
      <NodeShell
        handles={[
          { type: "target", position: Position.Left, label: "Query" },
          {
            id: "results",
            type: "source",
            position: Position.Right,
            offset: "35%",
            label: "Results",
          },
          {
            id: "answer",
            type: "source",
            position: Position.Right,
            offset: "65%",
            label: "Answer",
          },
        ]}
        ref={ref}
        selected={selected}
        status={data.status}
      >
        <NodeHeader
          colorVar="--node-rag"
          icon={<Icons.BookOpen size={20} />}
          subtitle={
            <span className="flex items-center gap-1">
              <SearchIcon size={12} />
              {SEARCH_LABELS[data.config.searchType] ?? "Hybrid"}
            </span>
          }
          title={data.label}
        />

        <NodeSection>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <NodeField label="Top K" mono value={topK} />
              <NodeField label="Min Score" mono value={minScore.toFixed(2)} />
            </div>

            {data.config.connectorTypes &&
              data.config.connectorTypes.length > 0 && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Sources</span>
                  <div className="flex flex-wrap gap-1">
                    {data.config.connectorTypes.map((type) => {
                      const SourceIcon = SOURCE_ICONS[type] ?? Icons.Database;
                      return (
                        <span
                          className="flex items-center gap-1 rounded-sm bg-muted/50 px-1.5 py-0.5 text-xs"
                          key={type}
                        >
                          <SourceIcon size={12} />
                          <span className="capitalize">
                            {type.replace(/[_-]/g, " ")}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

            {featureBadges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {featureBadges.map((badge) => {
                  const BadgeIcon = badge.icon;
                  return (
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs",
                        "bg-primary/10 text-primary"
                      )}
                      key={badge.id}
                    >
                      <BadgeIcon size={10} />
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            )}

            {data.executionStep && data.executionStep !== "idle" && (
              <div className="border-border/50 border-t pt-2">
                <RagExecutionStatus
                  progress={
                    hasResults
                      ? {
                          step: data.executionStep,
                          chunksRetrieved: chunksCount,
                        }
                      : undefined
                  }
                  status={data.executionStep}
                />
              </div>
            )}

            {hasResults && (
              <div className="border-border/50 border-t pt-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="font-mono text-lg">{chunksCount}</div>
                    <div className="text-muted-foreground text-xs">Chunks</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg">{citationsCount}</div>
                    <div className="text-muted-foreground text-xs">
                      Citations
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-lg">
                      {data.executionResult?.usage.latencyMs
                        ? `${(data.executionResult.usage.latencyMs / 1000).toFixed(1)}s`
                        : "-"}
                    </div>
                    <div className="text-muted-foreground text-xs">Time</div>
                  </div>
                </div>
              </div>
            )}
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
      diversityPenalty: 0,
      rerank: true,
      synthesize: true,
      citationStyle: "inline",
      queryExpansion: false,
      chunkStrategy: "semantic",
      maxChunkSize: 512,
      chunkOverlap: 50,
      deduplicate: true,
      dedupeThreshold: 0.95,
    },
    inputs: [{ id: "query", label: "Query", type: "data", required: true }],
    outputs: [
      { id: "results", label: "Results", type: "data", required: false },
      { id: "answer", label: "Answer", type: "data", required: false },
    ],
  };
}
