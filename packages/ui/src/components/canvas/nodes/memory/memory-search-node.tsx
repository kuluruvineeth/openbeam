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
      const query = data.config.query?.trim() ?? "";
      const scope = data.config.scope ?? "workflow";
      const topK = data.config.topK ?? 10;
      const threshold =
        data.config.threshold !== undefined ? data.config.threshold : 0.5;
      const namespace = data.config.namespace?.trim() ?? "";
      const memoryTypes = data.config.memoryTypes ?? [];
      const tags = data.config.tags ?? [];

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!query) {
          list.push("Query is required");
        }
        if (topK <= 0) {
          list.push("Top K must be at least 1");
        }
        if (threshold < 0 || threshold > 1) {
          list.push("Threshold must be between 0 and 1");
        }
        if (data.config.dateRange?.start && data.config.dateRange?.end) {
          const start = Date.parse(data.config.dateRange.start);
          const end = Date.parse(data.config.dateRange.end);
          if (!(Number.isNaN(start) || Number.isNaN(end)) && start > end) {
            list.push("Date range start must be before end");
          }
        }
        return list;
      }, [
        data.config.dateRange?.end,
        data.config.dateRange?.start,
        query,
        threshold,
        topK,
      ]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (namespace) {
          list.push("Namespace scoped");
        }
        if (memoryTypes.length > 0) {
          list.push(`${memoryTypes.length} memory types filtered`);
        }
        if (tags.length > 0) {
          list.push(`${tags.length} tag${tags.length > 1 ? "s" : ""} filtered`);
        }
        if (data.config.rerank) {
          list.push("Rerank enabled");
        }
        if (data.config.includeMetadata === false) {
          list.push("Metadata excluded from results");
        }
        return list;
      }, [
        data.config.includeMetadata,
        data.config.rerank,
        memoryTypes.length,
        namespace,
        tags.length,
      ]);

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
              {query ? (
                <p className="truncate font-mono text-muted-foreground/70 text-xs">
                  {query.slice(0, 40)}
                  {query.length > 40 ? "..." : ""}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">No query set</p>
              )}

              <div className="flex items-center justify-between">
                <NodeField label="Top K" mono value={topK} />
                <NodeField
                  label="Threshold"
                  mono
                  value={threshold.toFixed(2)}
                />
                <span className="rounded-sm bg-muted/50 px-1.5 py-0.5 text-muted-foreground text-xs">
                  {SCOPE_LABELS[scope] ?? "Workflow"}
                </span>
              </div>

              {memoryTypes.length > 0 && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">
                    Memory Types
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {memoryTypes.map((type) => {
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

              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((warning) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-warning"
                      key={warning}
                    >
                      <Icons.AlertCircle size={12} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {notes.length > 0 && (
                <div className="space-y-1">
                  {notes.map((note) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      key={note}
                    >
                      <Icons.Info size={12} />
                      <span>{note}</span>
                    </div>
                  ))}
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
