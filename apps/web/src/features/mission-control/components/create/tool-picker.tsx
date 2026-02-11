"use client";

import { cva } from "class-variance-authority";
import { useMemo } from "react";

type ToolDefinition = {
  name: string;
  category: string;
  description: string;
};

const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    name: "search_hybrid",
    category: "search",
    description: "Search across all connected sources",
  },
  {
    name: "search_semantic",
    category: "search",
    description: "Semantic similarity search",
  },
  {
    name: "doc_get",
    category: "documents",
    description: "Get document by ID",
  },
  {
    name: "doc_chunks",
    category: "documents",
    description: "Get document chunks",
  },
  {
    name: "rag_answer",
    category: "rag",
    description: "RAG-grounded answer",
  },
  {
    name: "rag_verify",
    category: "rag",
    description: "Verify claim against sources",
  },
  {
    name: "connector_list",
    category: "connectors",
    description: "List available connectors",
  },
  {
    name: "connector_sync",
    category: "connectors",
    description: "Trigger connector sync",
  },
];

const toolBadgeVariants = cva(
  "inline-flex cursor-pointer items-center rounded-sm px-2 py-1 font-medium text-[11px] transition-colors",
  {
    variants: {
      selected: {
        true: "border border-primary/30 bg-primary/10 text-primary",
        false:
          "border border-border/30 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    },
    defaultVariants: { selected: false },
  }
);

function groupByCategory(
  tools: ToolDefinition[]
): Record<string, ToolDefinition[]> {
  const grouped: Record<string, ToolDefinition[]> = {};
  for (const tool of tools) {
    const list = grouped[tool.category] ?? [];
    list.push(tool);
    grouped[tool.category] = list;
  }
  return grouped;
}

type ToolPickerProps = {
  selected: string[];
  onChange: (tools: string[]) => void;
};

export function ToolPicker({ selected, onChange }: ToolPickerProps) {
  const grouped = useMemo(() => groupByCategory(AVAILABLE_TOOLS), []);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(toolName: string) {
    if (selectedSet.has(toolName)) {
      onChange(selected.filter((t) => t !== toolName));
    } else {
      onChange([...selected, toolName]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(grouped).map(([category, tools]) => (
        <div className="flex flex-col gap-1.5" key={category}>
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
            {category}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((tool) => (
              <button
                className={toolBadgeVariants({
                  selected: selectedSet.has(tool.name),
                })}
                key={tool.name}
                onClick={() => toggle(tool.name)}
                title={tool.description}
                type="button"
              >
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { toolBadgeVariants, AVAILABLE_TOOLS };
