"use client";

import { memo } from "react";
import { cn } from "../../utils";
import { Icons } from "../icons";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Icons;
  nodeCount: number;
}

const STARTER_TEMPLATES: Template[] = [
  {
    id: "rag-chatbot",
    name: "RAG Chatbot",
    description: "Search docs and answer questions",
    icon: "Search",
    nodeCount: 4,
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    description: "Extract, transform, and load data",
    icon: "ArrowRight",
    nodeCount: 5,
  },
  {
    id: "approval-flow",
    name: "Approval Flow",
    description: "Human-in-the-loop workflow",
    icon: "CheckCircle",
    nodeCount: 3,
  },
];

export interface CanvasEmptyStateProps {
  onAddNode?: () => void;
  onSelectTemplate?: (templateId: string) => void;
  className?: string;
}

export const CanvasEmptyState = memo(function CanvasEmptyStateComponent({
  onAddNode,
  onSelectTemplate,
  className,
}: CanvasEmptyStateProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-sm border border-border/40 bg-muted/30">
            <Icons.Workflow className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-[15px]">Build your workflow</h3>
            <p className="max-w-[280px] text-[13px] text-muted-foreground">
              Add nodes to create an AI agent that can search, reason, and take
              actions.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            className="group flex items-center gap-3 rounded-sm border border-border/40 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-muted/30"
            onClick={onAddNode}
            type="button"
          >
            <div className="flex size-8 items-center justify-center rounded-sm bg-foreground text-background">
              <Icons.Plus size={16} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-[13px]">Start from scratch</p>
              <p className="text-[12px] text-muted-foreground">
                Add your first node
              </p>
            </div>
            <kbd className="hidden rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground group-hover:inline">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-[11px] text-muted-foreground">
              or use a template
            </span>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {STARTER_TEMPLATES.map((template) => {
              const Icon = Icons[template.icon];
              return (
                <button
                  className="flex flex-col items-center gap-2 rounded-sm border border-border/40 bg-background px-3 py-3 text-center transition-colors hover:border-border hover:bg-muted/30"
                  key={template.id}
                  onClick={() => onSelectTemplate?.(template.id)}
                  type="button"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-[12px]">{template.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {template.nodeCount} nodes
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/70">
          Press{" "}
          <kbd className="rounded border border-border/40 px-1 font-mono text-[10px]">
            ⌘K
          </kbd>{" "}
          anytime to add nodes
        </p>
      </div>
    </div>
  );
});

CanvasEmptyState.displayName = "CanvasEmptyState";
