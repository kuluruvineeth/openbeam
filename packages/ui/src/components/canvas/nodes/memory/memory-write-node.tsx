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
      const key = data.config.key?.trim() ?? "";
      const namespace = data.config.namespace?.trim() ?? "";
      const scope = data.config.scope ?? "workflow";
      const encoding = data.config.encoding ?? "json";

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!key) {
          list.push("Key is required");
        }
        if (!data.config.overwrite) {
          list.push("Writes will skip existing values");
        }
        if (data.config.ttlMs !== undefined && data.config.ttlMs <= 0) {
          list.push("TTL must be greater than 0");
        }
        return list;
      }, [data.config.overwrite, data.config.ttlMs, key]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (namespace) {
          list.push("Namespace scoped");
        }
        if (data.config.generateEmbedding) {
          list.push("Embedding generated on write");
        }
        if (encoding === "embedding") {
          list.push("Embedding input uses vector or content");
        }
        if (data.config.tags && data.config.tags.length > 0) {
          list.push(
            `${data.config.tags.length} tag${
              data.config.tags.length > 1 ? "s" : ""
            }`
          );
        }
        return list;
      }, [
        data.config.generateEmbedding,
        data.config.tags,
        encoding,
        namespace,
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
                <NodeField label="Key" mono value={key || "Not set"} />
                <span className="rounded-sm bg-muted/50 px-1.5 py-0.5 text-muted-foreground text-xs">
                  {SCOPE_LABELS[scope] ?? "Workflow"}
                </span>
              </div>

              {namespace && (
                <NodeField label="Namespace" mono value={namespace} />
              )}

              <div className="flex items-center justify-between">
                <NodeField label="TTL" value={ttlDisplay} />
                <NodeField label="Encoding" value={ENCODING_LABELS[encoding]} />
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
