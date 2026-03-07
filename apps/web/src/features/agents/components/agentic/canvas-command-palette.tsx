"use client";

import type { NodeCategory } from "@openbeam/types/canvas";
import {
  CATEGORY_LABELS,
  getNodesByCategory,
  type NodeRegistryEntry,
} from "@openbeam/ui";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@openbeam/ui/components/command";
import { useCallback, useMemo } from "react";

interface CanvasCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNode: (nodeType: string) => void;
}

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

export function CanvasCommandPalette({
  open,
  onOpenChange,
  onSelectNode,
}: CanvasCommandPaletteProps) {
  const nodesByCategory = useMemo(() => {
    const map = new Map<NodeCategory, NodeRegistryEntry[]>();
    for (const category of CATEGORY_ORDER) {
      const nodes = getNodesByCategory(category);
      if (nodes.length > 0) {
        map.set(category, nodes);
      }
    }
    return map;
  }, []);

  const handleSelect = useCallback(
    (nodeType: string) => {
      onSelectNode(nodeType);
      onOpenChange(false);
    },
    [onSelectNode, onOpenChange]
  );

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandInput placeholder="Search nodes..." />
      <CommandList>
        <CommandEmpty>No nodes found.</CommandEmpty>
        {Array.from(nodesByCategory.entries()).map(([category, nodes]) => (
          <CommandGroup heading={CATEGORY_LABELS[category]} key={category}>
            {nodes.map((node) => {
              const Icon = node.icon;
              return (
                <CommandItem
                  key={node.id}
                  onSelect={() => handleSelect(node.id)}
                  value={`${node.label} ${node.description}`}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{node.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {node.description}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
