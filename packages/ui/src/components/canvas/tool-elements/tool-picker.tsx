"use client";

import type { ComponentType, SVGProps } from "react";
import { forwardRef, memo, useMemo, useState } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../command";
import { Icons } from "../../icons";
import { Popover, PopoverContent, PopoverTrigger } from "../../popover";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const CATEGORY_ICONS: Record<string, IconComponent> = {
  search: Icons.Search,
  rag: Icons.BrainCircuit,
  documents: Icons.FileText,
  connectors: Icons.Plug,
  data: Icons.Database,
  media: Icons.Film,
  browser: Icons.Globe,
  action: Icons.Zap,
  analysis: Icons.BarChart,
  integration: Icons.Link,
  system: Icons.Settings2,
  skills: Icons.Sparkles,
  canvas: Icons.Layers,
};

const CATEGORY_COLORS: Record<string, string> = {
  search: "text-blue-500",
  rag: "text-violet-500",
  documents: "text-emerald-500",
  connectors: "text-amber-500",
  data: "text-sky-500",
  media: "text-pink-500",
  browser: "text-orange-500",
  action: "text-red-500",
  analysis: "text-teal-500",
  integration: "text-indigo-500",
  system: "text-slate-500",
  skills: "text-purple-500",
  canvas: "text-cyan-500",
};

function getCategoryIcon(category: string): IconComponent {
  return CATEGORY_ICONS[category] ?? Icons.Wrench;
}

export interface ToolPickerItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ToolPickerProps {
  tools: ToolPickerItem[];
  selectedToolId: string;
  onSelect: (toolId: string) => void;
  disabled?: boolean;
}

export const ToolPicker = memo(
  forwardRef<HTMLButtonElement, ToolPickerProps>(function ToolPickerComponent(
    { tools, selectedToolId, onSelect, disabled },
    ref
  ) {
    const [open, setOpen] = useState(false);

    const selectedTool = useMemo(
      () => tools.find((t) => t.id === selectedToolId),
      [tools, selectedToolId]
    );

    const grouped = useMemo(() => {
      const groups = new Map<string, ToolPickerItem[]>();
      for (const tool of tools) {
        const key = tool.category || "other";
        const existing = groups.get(key);
        if (existing) {
          existing.push(tool);
        } else {
          groups.set(key, [tool]);
        }
      }
      return groups;
    }, [tools]);

    const SelectedIcon = selectedTool
      ? getCategoryIcon(selectedTool.category)
      : null;

    return (
      <Popover modal onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-border/50 bg-transparent px-3 text-left text-sm transition-colors",
              "hover:border-border hover:bg-muted/50",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
            disabled={disabled}
            ref={ref}
            type="button"
          >
            {selectedTool && SelectedIcon ? (
              <span className="flex items-center gap-2 truncate">
                <SelectedIcon
                  className={cn(
                    "size-3.5 shrink-0",
                    CATEGORY_COLORS[selectedTool.category] ??
                      "text-muted-foreground"
                  )}
                />
                <span className="truncate">{selectedTool.name}</span>
                <Badge
                  className="h-4 shrink-0 px-1 text-[10px]"
                  variant="secondary"
                >
                  {selectedTool.category}
                </Badge>
              </span>
            ) : (
              <span className="text-muted-foreground">Select tool...</span>
            )}
            <Icons.ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command>
            <CommandInput placeholder="Search tools..." />
            <CommandList className="no-scrollbar max-h-[300px]">
              <CommandEmpty>No tools found.</CommandEmpty>
              {Array.from(grouped).map(([category, items]) => {
                const CategoryIcon = getCategoryIcon(category);
                return (
                  <CommandGroup heading={category} key={category}>
                    {items.map((tool) => (
                      <CommandItem
                        key={tool.id}
                        onSelect={() => {
                          onSelect(tool.id);
                          setOpen(false);
                        }}
                        value={`${tool.name} ${tool.category}`}
                      >
                        <CategoryIcon
                          className={cn(
                            "mr-2 size-3.5",
                            CATEGORY_COLORS[tool.category] ??
                              "text-muted-foreground"
                          )}
                        />
                        <span className="flex-1 truncate">{tool.name}</span>
                        {tool.id === selectedToolId && (
                          <Icons.Check className="ml-auto size-3.5 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  })
);

ToolPicker.displayName = "ToolPicker";
