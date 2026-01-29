"use client";

import type {
  MemoryWriteNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface MemoryWriteNodeData {
  label: string;
  config: MemoryWriteNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type MemoryWriteNodeType = Node<MemoryWriteNodeData, "memory_write">;

const SCOPE_LABELS: Record<string, string> = {
  workflow: "Workflow",
  session: "Session",
  user: "User",
  team: "Team",
  global: "Global",
};

const MEMORY_TYPE_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Icons }
> = {
  semantic: { label: "Semantic", icon: "BrainIcon" },
  episodic: { label: "Episodic", icon: "Clock" },
  procedural: { label: "Procedural", icon: "Settings2" },
};

const ENCODING_LABELS: Record<string, string> = {
  json: "JSON",
  text: "Text",
  embedding: "Vector",
};

function formatTtl(ttlMs: number | undefined): string {
  if (!ttlMs) {
    return "No expiry";
  }
  if (ttlMs >= 86_400_000) {
    return `${Math.round(ttlMs / 86_400_000)}d`;
  }
  if (ttlMs >= 3_600_000) {
    return `${Math.round(ttlMs / 3_600_000)}h`;
  }
  return `${Math.round(ttlMs / 1000)}s`;
}

interface FeatureBadge {
  id: string;
  label: string;
  icon: keyof typeof Icons;
}

function getFeatureBadges(config: MemoryWriteNodeConfig): FeatureBadge[] {
  const badges: FeatureBadge[] = [];

  if (config.generateEmbedding) {
    badges.push({ id: "embed", label: "Embed", icon: "Sparkles" });
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

export const MemoryWriteNode = memo(
  forwardRef<HTMLDivElement, NodeProps<MemoryWriteNodeType>>(
    function MemoryWriteNodeComponent({ data, selected }, ref) {
      const ttlDisplay = formatTtl(data.config.ttlMs);
      const featureBadges = useMemo(
        () => getFeatureBadges(data.config),
        [data.config]
      );

      const memoryType = data.config.memoryType ?? "semantic";
      const typeConfig = MEMORY_TYPE_CONFIG[memoryType];
      const TypeIcon = Icons[typeConfig?.icon ?? "BrainIcon"];

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
            icon={<Icons.Upload size={20} />}
            subtitle={
              <span className="flex items-center gap-1">
                <TypeIcon size={12} />
                {typeConfig?.label ?? "Semantic"}
              </span>
            }
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <NodeField
                  label="Key"
                  mono
                  value={data.config.key || "Not set"}
                />
                <span className="rounded-sm bg-muted/50 px-1.5 py-0.5 text-muted-foreground text-xs">
                  {SCOPE_LABELS[data.config.scope] ?? "Workflow"}
                </span>
              </div>

              {data.config.namespace && (
                <NodeField
                  label="Namespace"
                  mono
                  value={data.config.namespace}
                />
              )}

              <div className="flex items-center justify-between">
                <NodeField label="TTL" value={ttlDisplay} />
                <NodeField
                  label="Encoding"
                  value={ENCODING_LABELS[data.config.encoding ?? "json"]}
                />
              </div>

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
                  {!data.config.overwrite && (
                    <span className="flex items-center gap-1 rounded-sm bg-amber-500/10 px-1.5 py-0.5 text-amber-500 text-xs">
                      <Icons.AlertCircle size={10} />
                      No overwrite
                    </span>
                  )}
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

MemoryWriteNode.displayName = "MemoryWriteNode";

export function createMemoryWriteNodeData(): MemoryWriteNodeData {
  return {
    label: "Memory Write",
    config: {
      key: "",
      scope: "workflow",
      memoryType: "semantic",
      encoding: "json",
      overwrite: true,
      generateEmbedding: false,
    },
    inputs: [{ id: "value", label: "Value", type: "data", required: true }],
    outputs: [
      { id: "success", label: "Success", type: "control", required: true },
    ],
  };
}
