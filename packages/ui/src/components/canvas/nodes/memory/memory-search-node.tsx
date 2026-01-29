"use client";

import type {
  MemorySearchNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface MemorySearchNodeData {
  label: string;
  config: MemorySearchNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type MemorySearchNodeType = Node<MemorySearchNodeData, "memory_search">;

const SCOPE_LABELS: Record<string, string> = {
  workflow: "Workflow",
  session: "Session",
  user: "User",
  team: "Team",
  global: "Global",
};

const SEARCH_MODE_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Icons }
> = {
  hybrid: { label: "Hybrid", icon: "Sparkles" },
  semantic: { label: "Semantic", icon: "BrainCircuit" },
  keyword: { label: "Keyword", icon: "Search" },
};

const MEMORY_TYPE_ICONS: Record<string, keyof typeof Icons> = {
  semantic: "BrainIcon",
  episodic: "Clock",
  procedural: "Settings2",
};

interface FeatureBadge {
  id: string;
  label: string;
  icon: keyof typeof Icons;
}

function getFeatureBadges(config: MemorySearchNodeConfig): FeatureBadge[] {
  const badges: FeatureBadge[] = [];

  if (config.rerank) {
    badges.push({ id: "rerank", label: "Rerank", icon: "Layers" });
  }

  if (config.includeMetadata !== false) {
    badges.push({ id: "meta", label: "Metadata", icon: "Info" });
  }

  if (config.tags && config.tags.length > 0) {
    badges.push({
      id: "tags",
      label: `${config.tags.length} tags`,
      icon: "Tags",
    });
  }

  return badges;
}

export const MemorySearchNode = memo(
  forwardRef<HTMLDivElement, NodeProps<MemorySearchNodeType>>(
    function MemorySearchNodeComponent({ data, selected }, ref) {
      const featureBadges = useMemo(
        () => getFeatureBadges(data.config),
        [data.config]
      );

      const searchMode = data.config.searchMode ?? "hybrid";
      const modeConfig = SEARCH_MODE_CONFIG[searchMode];
      const ModeIcon = Icons[modeConfig?.icon ?? "Search"];

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
            colorVar="--node-memory"
            icon={<Icons.Search size={20} />}
            subtitle={
              <span className="flex items-center gap-1">
                <ModeIcon size={12} />
                {modeConfig?.label ?? "Hybrid"}
              </span>
            }
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-3">
              {data.config.query ? (
                <p className="truncate font-mono text-muted-foreground/70 text-xs">
                  {data.config.query.slice(0, 40)}
                  {data.config.query.length > 40 ? "..." : ""}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">No query set</p>
              )}

              <div className="flex items-center justify-between">
                <NodeField label="Top K" mono value={data.config.topK ?? 10} />
                <NodeField
                  label="Threshold"
                  mono
                  value={
                    data.config.threshold !== undefined
                      ? data.config.threshold.toFixed(2)
                      : "0.50"
                  }
                />
                <span className="rounded-sm bg-muted/50 px-1.5 py-0.5 text-muted-foreground text-xs">
                  {SCOPE_LABELS[data.config.scope] ?? "Workflow"}
                </span>
              </div>

              {data.config.memoryTypes &&
                data.config.memoryTypes.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs">
                      Memory Types
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {data.config.memoryTypes.map((type) => {
                        const TypeIcon =
                          Icons[MEMORY_TYPE_ICONS[type] ?? "Database"];
                        return (
                          <span
                            className="flex items-center gap-1 rounded-sm bg-muted/50 px-1.5 py-0.5 text-xs"
                            key={type}
                          >
                            <TypeIcon size={12} />
                            <span className="capitalize">{type}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

              {featureBadges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {featureBadges.map((badge) => {
                    const BadgeIcon = Icons[badge.icon];
                    return (
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs",
                          "bg-[var(--node-memory)]/10 text-[var(--node-memory)]"
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
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

MemorySearchNode.displayName = "MemorySearchNode";

export function createMemorySearchNodeData(): MemorySearchNodeData {
  return {
    label: "Memory Search",
    config: {
      query: "",
      scope: "workflow",
      searchMode: "hybrid",
      topK: 10,
      threshold: 0.5,
      includeMetadata: true,
      rerank: false,
    },
    inputs: [{ id: "query", label: "Query", type: "data", required: false }],
    outputs: [
      { id: "results", label: "Results", type: "data", required: true },
    ],
  };
}
