"use client";

import type {
  MemoryReadNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface MemoryReadNodeData {
  label: string;
  config: MemoryReadNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type MemoryReadNodeType = Node<MemoryReadNodeData, "memory_read">;

const SCOPE_LABELS: Record<string, string> = {
  workflow: "Workflow",
  session: "Session",
  user: "User",
  team: "Team",
  global: "Global",
};

const SCOPE_ICONS: Record<string, keyof typeof Icons> = {
  workflow: "Workflow",
  session: "Repeat",
  user: "User",
  team: "Users",
  global: "Globe",
};

interface FeatureBadge {
  id: string;
  label: string;
  icon: keyof typeof Icons;
  variant?: "default" | "warning";
}

function getFeatureBadges(config: MemoryReadNodeConfig): FeatureBadge[] {
  const badges: FeatureBadge[] = [];

  if (config.includeMetadata) {
    badges.push({ id: "meta", label: "Metadata", icon: "Info" });
  }

  if (config.throwOnMissing) {
    badges.push({
      id: "throw",
      label: "Strict",
      icon: "AlertCircle",
      variant: "warning",
    });
  }

  if (config.defaultValue !== undefined) {
    badges.push({ id: "default", label: "Default", icon: "Settings2" });
  }

  return badges;
}

export const MemoryReadNode = memo(
  forwardRef<HTMLDivElement, NodeProps<MemoryReadNodeType>>(
    function MemoryReadNodeComponent({ data, selected }, ref) {
      const featureBadges = useMemo(
        () => getFeatureBadges(data.config),
        [data.config]
      );

      const scope = data.config.scope ?? "workflow";
      const ScopeIcon = Icons[SCOPE_ICONS[scope] ?? "Database"];

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
            icon={<Icons.Download size={20} />}
            subtitle={
              <span className="flex items-center gap-1">
                <ScopeIcon size={12} />
                {SCOPE_LABELS[scope]}
              </span>
            }
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-3">
              <NodeField
                label="Key"
                mono
                value={data.config.key || "Not set"}
              />

              {data.config.namespace && (
                <NodeField
                  label="Namespace"
                  mono
                  value={data.config.namespace}
                />
              )}

              {featureBadges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {featureBadges.map((badge) => {
                    const BadgeIcon = Icons[badge.icon];
                    return (
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs",
                          badge.variant === "warning"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-[var(--node-memory)]/10 text-[var(--node-memory)]"
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

MemoryReadNode.displayName = "MemoryReadNode";

export function createMemoryReadNodeData(): MemoryReadNodeData {
  return {
    label: "Memory Read",
    config: {
      key: "",
      scope: "workflow",
      throwOnMissing: false,
      includeMetadata: false,
    },
    outputs: [{ id: "value", label: "Value", type: "data", required: true }],
  };
}
