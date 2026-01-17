"use client";

import type { NodeCategory } from "@openplane/types/canvas";
import {
  Bot,
  ChevronDown,
  CircleCheck,
  Code2,
  FileSearch,
  FileText,
  Filter,
  GitBranch,
  GitMerge,
  Hand,
  ListChecks,
  MessageSquare,
  Play,
  Repeat,
  Search,
  Split,
  Square,
  StickyNote,
  Tags,
  Zap,
} from "lucide-react";
import type { ComponentType, DragEvent } from "react";
import { memo, useCallback, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/collapsible";
import { ScrollArea } from "../../../components/scroll-area";
import { cn } from "../../../utils";

interface NodeTypeInfo {
  type: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: NodeCategory;
}

const NODE_TYPES: NodeTypeInfo[] = [
  {
    type: "start",
    label: "Start",
    description: "Entry point for the workflow",
    icon: Play,
    category: "control",
  },
  {
    type: "end",
    label: "End",
    description: "Exit point for the workflow",
    icon: Square,
    category: "control",
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branch based on conditions",
    icon: GitBranch,
    category: "control",
  },
  {
    type: "loop",
    label: "Loop",
    description: "Repeat actions",
    icon: Repeat,
    category: "control",
  },
  {
    type: "parallel_split",
    label: "Parallel Split",
    description: "Split into parallel branches",
    icon: Split,
    category: "control",
  },
  {
    type: "parallel_join",
    label: "Parallel Join",
    description: "Join parallel branches",
    icon: GitMerge,
    category: "control",
  },
  {
    type: "llm",
    label: "LLM",
    description: "Call a language model",
    icon: Bot,
    category: "ai",
  },
  {
    type: "rag",
    label: "RAG",
    description: "Retrieval augmented generation",
    icon: FileSearch,
    category: "ai",
  },
  {
    type: "summarize",
    label: "Summarize",
    description: "Summarize text content",
    icon: FileText,
    category: "ai",
  },
  {
    type: "extract",
    label: "Extract",
    description: "Extract structured data",
    icon: Search,
    category: "ai",
  },
  {
    type: "classify",
    label: "Classify",
    description: "Classify into categories",
    icon: Tags,
    category: "ai",
  },
  {
    type: "template",
    label: "Template",
    description: "Apply text template",
    icon: MessageSquare,
    category: "transform",
  },
  {
    type: "code",
    label: "Code",
    description: "Execute custom code",
    icon: Code2,
    category: "transform",
  },
  {
    type: "filter",
    label: "Filter",
    description: "Filter data",
    icon: Filter,
    category: "transform",
  },
  {
    type: "approval",
    label: "Approval",
    description: "Request human approval",
    icon: CircleCheck,
    category: "human",
  },
  {
    type: "input",
    label: "Input",
    description: "Request user input",
    icon: Hand,
    category: "human",
  },
  {
    type: "annotation",
    label: "Annotation",
    description: "Add notes to canvas",
    icon: StickyNote,
    category: "human",
  },
  {
    type: "connector",
    label: "Connector",
    description: "Connect to external service",
    icon: Zap,
    category: "integration",
  },
  {
    type: "tool",
    label: "Tool",
    description: "Execute a tool",
    icon: ListChecks,
    category: "integration",
  },
];

const CATEGORY_INFO: Record<NodeCategory, { label: string; color: string }> = {
  control: { label: "Control Flow", color: "text-green-500" },
  ai: { label: "AI Processing", color: "text-purple-500" },
  transform: { label: "Transform", color: "text-amber-500" },
  human: { label: "Human", color: "text-cyan-500" },
  integration: { label: "Integration", color: "text-blue-500" },
};

interface NodePaletteItemProps {
  nodeType: NodeTypeInfo;
  onDragStart?: (event: DragEvent, type: string) => void;
}

const NodePaletteItem = memo(function NodePaletteItemComponent({
  nodeType,
  onDragStart,
}: NodePaletteItemProps) {
  const Icon = nodeType.icon;

  const handleDragStart = useCallback(
    (event: DragEvent) => {
      event.dataTransfer.setData("application/reactflow", nodeType.type);
      event.dataTransfer.effectAllowed = "move";
      onDragStart?.(event, nodeType.type);
    },
    [nodeType.type, onDragStart]
  );

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Drag and drop requires event handler on list item
    <li
      aria-label={`Drag ${nodeType.label} node to canvas`}
      className={cn(
        "flex cursor-grab items-center gap-3 rounded-md border border-transparent p-2",
        "bg-muted/50 transition-colors hover:border-border hover:bg-muted",
        "active:cursor-grabbing",
        "list-none"
      )}
      draggable
      onDragStart={handleDragStart}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md",
          "bg-background shadow-sm"
        )}
      >
        <Icon
          className={cn("h-4 w-4", CATEGORY_INFO[nodeType.category].color)}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-sm">{nodeType.label}</div>
        <div className="truncate text-muted-foreground text-xs">
          {nodeType.description}
        </div>
      </div>
    </li>
  );
});

interface NodePaletteCategoryProps {
  category: NodeCategory;
  nodes: NodeTypeInfo[];
  defaultOpen?: boolean;
  onDragStart?: (event: DragEvent, type: string) => void;
}

const NodePaletteCategory = memo(function NodePaletteCategoryComponent({
  category,
  nodes,
  defaultOpen = true,
  onDragStart,
}: NodePaletteCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const categoryInfo = CATEGORY_INFO[category];

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium text-sm hover:text-primary">
        <span className={categoryInfo.color}>{categoryInfo.label}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <ul className="space-y-1 pb-2">
          {nodes.map((node) => (
            <NodePaletteItem
              key={node.type}
              nodeType={node}
              onDragStart={onDragStart}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
});

export interface NodePaletteProps {
  className?: string;
  onDragStart?: (event: DragEvent, type: string) => void;
}

export const NodePalette = memo(function NodePaletteComponent({
  className,
  onDragStart,
}: NodePaletteProps) {
  const categories: NodeCategory[] = [
    "control",
    "ai",
    "transform",
    "human",
    "integration",
  ];

  const nodesByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = NODE_TYPES.filter((node) => node.category === category);
      return acc;
    },
    {} as Record<NodeCategory, NodeTypeInfo[]>
  );

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col border-r bg-background",
        className
      )}
    >
      <div className="border-b p-4">
        <h2 className="font-semibold text-sm">Node Palette</h2>
        <p className="text-muted-foreground text-xs">
          Drag nodes to the canvas
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {categories.map((category) => (
            <NodePaletteCategory
              category={category}
              defaultOpen={category === "control" || category === "ai"}
              key={category}
              nodes={nodesByCategory[category]}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});
NodePalette.displayName = "NodePalette";
