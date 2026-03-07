"use client";

import { DEFAULT_CHAT_MODEL, getChatModel } from "@openbeam/types/ai";
import type {
  ClassificationMode,
  ClassifyCategory,
  ClassifyNodeConfig,
  NodeStatus,
  Port,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

const CATEGORY_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f97316",
  "#6366f1",
];

const MODE_LABELS: Record<ClassificationMode, string> = {
  categories: "Categories",
  routing: "Routing",
  zero_shot: "Zero-Shot",
};

const MODE_ICONS: Record<ClassificationMode, React.ReactNode> = {
  categories: <Icons.Tags className="size-3" />,
  routing: <Icons.GitBranch className="size-3" />,
  zero_shot: <Icons.Zap className="size-3" />,
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function resolveFallbackCategory(
  config: ClassifyNodeConfig,
  categories: ClassifyCategory[]
): ClassifyCategory | undefined {
  if (config.fallbackCategoryId) {
    return categories.find(
      (category) => category.id === config.fallbackCategoryId
    );
  }
  return categories.find((category) => category.isFallback);
}

export interface ClassifyNodeData {
  label: string;
  config: ClassifyNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ClassifyNodeType = Node<ClassifyNodeData, "classify">;

export const ClassifyNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ClassifyNodeType>>(
    function ClassifyNodeComponent({ data, selected }, ref) {
      const {
        mode = "categories",
        categories = [],
        allowMultiple = false,
        confidenceThreshold = 0.7,
        fallbackBehavior = "other_branch",
      } = data.config;

      const categoryCount = categories.length;
      const fallbackCategory = resolveFallbackCategory(data.config, categories);
      const modelId = data.config.model?.trim() || DEFAULT_CHAT_MODEL;
      const modelMeta = getChatModel(modelId);
      const modelLabel = modelMeta?.name ?? modelId;
      const normalizedNames = categories.map((category) =>
        normalizeName(category.name)
      );
      const uniqueNames = new Set(normalizedNames.filter(Boolean));
      const hasDuplicateNames =
        uniqueNames.size !== normalizedNames.filter(Boolean).length;
      const hasEmptyName = normalizedNames.some((name) => !name);
      let fallbackLabel = "Error";
      if (fallbackBehavior === "other_branch") {
        fallbackLabel = fallbackCategory?.name ?? "Other";
      } else if (fallbackBehavior === "lowest_match") {
        fallbackLabel = "Lowest match";
      } else if (fallbackBehavior === "discard") {
        fallbackLabel = "Discard";
      }

      const handles = useMemo(() => {
        const result: Array<{
          id?: string;
          type: "source" | "target";
          position: Position;
          variant?: "default" | "true" | "false";
          offset?: string;
          label?: string;
        }> = [{ type: "target", position: Position.Left }];

        if (mode === "routing" && categoryCount > 0) {
          const nonFallbackCategories = categories.filter((c) => !c.isFallback);
          const totalOutputs =
            nonFallbackCategories.length +
            (fallbackBehavior === "other_branch" ? 1 : 0);

          nonFallbackCategories.forEach((category, index) => {
            const offset = ((index + 1) / (totalOutputs + 1)) * 100;
            result.push({
              id: category.id,
              type: "source",
              position: Position.Right,
              offset: `${offset}%`,
              variant: "default",
              label: category.name,
            });
          });

          if (fallbackBehavior === "other_branch") {
            const offset =
              (nonFallbackCategories.length + 1) / (totalOutputs + 1);
            result.push({
              id: "other",
              type: "source",
              position: Position.Right,
              offset: `${offset * 100}%`,
              variant: "false",
              label: fallbackCategory?.name ?? "Other",
            });
          }
        } else {
          result.push({ type: "source", position: Position.Right });
        }

        return result;
      }, [mode, categories, categoryCount, fallbackBehavior, fallbackCategory]);

      const confidencePercent = Math.round(confidenceThreshold * 100);
      const isLowConfidence = confidenceThreshold < 0.7;
      const isHighConfidence = confidenceThreshold >= 0.9;
      const warnings = useMemo(() => {
        const items: string[] = [];
        if (categoryCount === 0) {
          items.push("Add at least one category");
        }
        if (hasEmptyName) {
          items.push("Fill in category names");
        }
        if (hasDuplicateNames) {
          items.push("Duplicate category names detected");
        }
        if (mode === "routing" && allowMultiple) {
          items.push("Multi-label is disabled in routing mode");
        }
        if (
          fallbackBehavior === "other_branch" &&
          categoryCount > 0 &&
          !fallbackCategory
        ) {
          items.push("Select a fallback category to label the Other branch");
        }
        return items;
      }, [
        allowMultiple,
        categoryCount,
        fallbackBehavior,
        fallbackCategory,
        hasDuplicateNames,
        hasEmptyName,
        mode,
      ]);

      const notes = useMemo(() => {
        const items: string[] = [];
        if (mode === "routing") {
          items.push("Routing creates an output handle per category");
        }
        if (!data.config.enableAutoFix) {
          items.push("Auto-fix is disabled");
        }
        if (data.config.enableMemory) {
          items.push("Memory is enabled");
        }
        if (fallbackBehavior === "lowest_match") {
          items.push("Lowest-match can return below-threshold results");
        }
        return items;
      }, [
        data.config.enableAutoFix,
        data.config.enableMemory,
        fallbackBehavior,
        mode,
      ]);

      return (
        <NodeShell
          handles={handles}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-classify"
            icon={<Icons.Tags size={20} />}
            subtitle={`${categoryCount} ${categoryCount === 1 ? "category" : "categories"}`}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <NodeField label="Model" value={modelLabel} />
                <NodeField label="Fallback" value={fallbackLabel} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
                  {MODE_ICONS[mode]}
                  {MODE_LABELS[mode]}
                </span>

                {allowMultiple && (
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Multi-label
                  </span>
                )}

                <span
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 font-mono text-[10px]",
                    isLowConfidence && "bg-amber-500/10 text-amber-500",
                    isHighConfidence && "bg-emerald-500/10 text-emerald-500",
                    !(isLowConfidence || isHighConfidence) &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  ≥{confidencePercent}%
                </span>
              </div>

              {categoryCount > 0 && (
                <div className="flex flex-wrap gap-1">
                  {categories.slice(0, 5).map((cat, index) => (
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-sm px-1.5 py-0.5",
                        cat.isFallback
                          ? "bg-muted-foreground/10"
                          : "bg-secondary/50"
                      )}
                      key={cat.id}
                    >
                      <div
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            cat.color ??
                            CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                        }}
                      />
                      <span
                        className={cn(
                          "truncate text-[10px]",
                          cat.isFallback && "text-muted-foreground italic"
                        )}
                      >
                        {cat.name}
                        {cat.isFallback && " (fallback)"}
                      </span>
                    </div>
                  ))}
                  {categoryCount > 5 && (
                    <span className="self-center text-[10px] text-muted-foreground">
                      +{categoryCount - 5} more
                    </span>
                  )}
                </div>
              )}

              {categoryCount === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  No categories defined
                </p>
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

ClassifyNode.displayName = "ClassifyNode";

export function createClassifyNodeData(): ClassifyNodeData {
  return {
    label: "Classify",
    config: {
      mode: "categories",
      categories: [],
      allowMultiple: false,
      model: DEFAULT_CHAT_MODEL,
      temperature: 0.1,
      confidenceThreshold: 0.7,
      includeConfidence: false,
      fallbackBehavior: "other_branch",
      enableAutoFix: true,
      enableMemory: false,
    },
    inputs: [{ id: "content", label: "Content", type: "data", required: true }],
    outputs: [
      {
        id: "classification",
        label: "Classification",
        type: "data",
        required: true,
      },
    ],
  };
}
