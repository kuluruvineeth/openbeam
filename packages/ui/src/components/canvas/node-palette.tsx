"use client";

import type { NodeCategory } from "@openbeam/types/canvas";
import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { memo, useCallback, useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/collapsible";
import { ScrollArea } from "../../components/scroll-area";
import { cn } from "../../utils";
import { Icons } from "../icons";
import {
  CATEGORY_LABELS,
  getNodesByCategory,
  type NodeRegistryEntry,
} from "./nodes/registry";

export interface NodePaletteProps {
  className?: string;
  defaultExpanded?: NodeCategory[];
  expandedCategories?: NodeCategory[];
  filter?: string;
  onNodeClick?: (nodeType: string) => void;
  onNodeDragEnd?: () => void;
  onNodeDragStart?: (nodeType: string) => void;
}

interface NodeItemProps {
  entry: NodeRegistryEntry;
  onClick?: () => void;
  onDragEnd: () => void;
  onDragStart: (e: DragEvent<HTMLButtonElement>, nodeType: string) => void;
}

const NodeItem = memo(function NodeItemComponent({
  entry,
  onClick,
  onDragEnd,
  onDragStart,
}: NodeItemProps) {
  const Icon = entry.icon;
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );

  return (
    <button
      className="flex w-full cursor-grab items-center gap-2 rounded-md border border-transparent bg-muted/50 px-2 py-1.5 text-left text-xs transition-colors hover:border-border hover:bg-muted active:cursor-grabbing"
      draggable
      onClick={onClick}
      onDragEnd={onDragEnd}
      onDragStart={(e) => onDragStart(e, entry.id)}
      onKeyDown={handleKeyDown}
      type="button"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{entry.label}</span>
    </button>
  );
});

interface CategorySectionProps {
  category: NodeCategory;
  entries: NodeRegistryEntry[];
  isExpanded: boolean;
  onDragEnd: () => void;
  onDragStart: (e: DragEvent<HTMLButtonElement>, nodeType: string) => void;
  onNodeClick?: (nodeType: string) => void;
  onToggle: () => void;
}

const CATEGORY_ICONS: Record<NodeCategory, ReactNode> = {
  ai: <Icons.BotIcon className="size-4" />,
  control: <Icons.GitBranch className="size-4" />,
  human: <Icons.Hand className="size-4" />,
  integration: <Icons.Plug className="size-4" />,
  memory: <Icons.Database className="size-4" />,
  orchestration: <Icons.Workflow className="size-4" />,
  transform: <Icons.Code className="size-4" />,
  trigger: <Icons.Zap className="size-4" />,
};

const CategorySection = memo(function CategorySectionComponent({
  category,
  entries,
  isExpanded,
  onDragEnd,
  onDragStart,
  onNodeClick,
  onToggle,
}: CategorySectionProps) {
  return (
    <Collapsible onOpenChange={onToggle} open={isExpanded}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 font-medium text-muted-foreground text-xs hover:bg-muted">
        <Icons.ChevronRight
          className={cn(
            "size-3 transition-transform",
            isExpanded && "rotate-90"
          )}
        />
        {CATEGORY_ICONS[category]}
        <span className="flex-1 text-left">{CATEGORY_LABELS[category]}</span>
        <span className="text-muted-foreground/60">{entries.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 py-1 pl-4">
        {entries.map((entry) => (
          <NodeItem
            entry={entry}
            key={entry.id}
            onClick={onNodeClick ? () => onNodeClick(entry.id) : undefined}
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
});

const CATEGORY_ORDER: NodeCategory[] = [
  "trigger",
  "control",
  "ai",
  "transform",
  "integration",
  "memory",
  "orchestration",
  "human",
];

export const NodePalette = memo(function NodePaletteComponent({
  className,
  defaultExpanded = ["trigger", "ai"],
  filter,
  onNodeClick,
  onNodeDragEnd,
  onNodeDragStart,
}: NodePaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<
    Set<NodeCategory>
  >(new Set(defaultExpanded));

  const categorizedNodes = useMemo(() => {
    const result: Record<NodeCategory, NodeRegistryEntry[]> = {
      ai: [],
      control: [],
      human: [],
      integration: [],
      memory: [],
      orchestration: [],
      transform: [],
      trigger: [],
    };

    for (const category of CATEGORY_ORDER) {
      const nodes = getNodesByCategory(category);
      if (filter) {
        const normalizedFilter = filter.toLowerCase();
        result[category] = nodes.filter(
          (n) =>
            n.label.toLowerCase().includes(normalizedFilter) ||
            n.description.toLowerCase().includes(normalizedFilter)
        );
      } else {
        result[category] = nodes;
      }
    }

    return result;
  }, [filter]);

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLButtonElement>, nodeType: string) => {
      e.dataTransfer.setData("application/reactflow", nodeType);
      e.dataTransfer.effectAllowed = "move";
      onNodeDragStart?.(nodeType);
    },
    [onNodeDragStart]
  );

  const handleDragEnd = useCallback(() => {
    onNodeDragEnd?.();
  }, [onNodeDragEnd]);

  const handleToggle = useCallback((category: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {CATEGORY_ORDER.map((category) => {
            const entries = categorizedNodes[category];
            if (entries.length === 0) {
              return null;
            }
            return (
              <CategorySection
                category={category}
                entries={entries}
                isExpanded={expandedCategories.has(category)}
                key={category}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
                onNodeClick={onNodeClick}
                onToggle={() => handleToggle(category)}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
});

NodePalette.displayName = "NodePalette";
