"use client";

import type { XYPosition } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "../../../utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../command";
import { createNodeData, createUniqueNodeId } from "./factory";
import {
  CATEGORY_LABELS,
  type NodeRegistryEntry,
  nodeRegistry,
} from "./registry";

const GROUPED_ENTRIES: Map<string, NodeRegistryEntry[]> = (() => {
  const groups = new Map<string, NodeRegistryEntry[]>();
  for (const entry of nodeRegistry) {
    const existing = groups.get(entry.category);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(entry.category, [entry]);
    }
  }
  return groups;
})();

export interface DropNodeData {
  isSource?: boolean;
  position?: XYPosition;
}

interface DropNodeProps {
  data: DropNodeData;
  id: string;
}

export const DropNode = memo(function DropNodeComponent({
  data,
  id,
}: DropNodeProps) {
  const { addNodes, deleteElements, getNode, addEdges, getNodeConnections } =
    useReactFlow();
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (type: string) => {
      const currentNode = getNode(id);
      const position = currentNode?.position || { x: 0, y: 0 };
      const sourceNodes = getNodeConnections({ nodeId: id });

      deleteElements({ nodes: [{ id }] });

      const newNodeId = createUniqueNodeId(type);
      const nodeData = createNodeData(type);

      addNodes({
        id: newNodeId,
        type,
        position,
        data: nodeData,
        origin: [0, 0.5],
      });

      for (const sourceNode of sourceNodes) {
        addEdges({
          id: createUniqueNodeId(`edge-${sourceNode.source}-${newNodeId}`),
          source: data.isSource ? newNodeId : sourceNode.source,
          target: data.isSource ? sourceNode.source : newNodeId,
          type: "animated",
        });
      }
    },
    [
      addEdges,
      addNodes,
      data.isSource,
      deleteElements,
      getNode,
      getNodeConnections,
      id,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        deleteElements({ nodes: [{ id }] });
      }
    };

    const handleClick = (event: MouseEvent) => {
      const nodeElement = ref.current;
      if (nodeElement && !nodeElement.contains(event.target as Node)) {
        deleteElements({ nodes: [{ id }] });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const clickTimeout = setTimeout(() => {
      window.addEventListener("click", handleClick);
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(clickTimeout);
      window.removeEventListener("click", handleClick);
    };
  }, [deleteElements, id]);

  return (
    <div
      className={cn(
        "rounded-[28px] border bg-card p-3 shadow-sm ring-1 ring-border",
        "w-[280px]"
      )}
      ref={ref}
    >
      <Command className="rounded-lg bg-transparent">
        <CommandInput autoFocus className="h-9" placeholder="Search nodes..." />
        <CommandList className="max-h-[300px]">
          <CommandEmpty>No nodes found.</CommandEmpty>
          {Array.from(GROUPED_ENTRIES.entries()).map(([category, entries]) => (
            <CommandGroup
              heading={
                CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]
              }
              key={category}
            >
              {entries.map((entry) => {
                const Icon = entry.icon;
                return (
                  <CommandItem
                    className="flex items-center gap-2"
                    key={entry.id}
                    onSelect={() => handleSelect(entry.id)}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm">{entry.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {entry.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  );
});
DropNode.displayName = "DropNode";
