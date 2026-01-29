"use client";

import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import type { MouseEvent, ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../../utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../command";
import { createNodeData, createUniqueNodeId } from "./nodes/factory";
import {
  CATEGORY_LABELS,
  type NodeRegistryEntry,
  visibleNodeRegistry,
} from "./nodes/registry";

interface CanvasContextMenuProps {
  children: ReactNode;
  className?: string;
  onNodeAdd?: (type: string, position: { x: number; y: number }) => void;
}

export const CanvasContextMenu = memo(function CanvasContextMenuComponent({
  children,
  className,
  onNodeAdd,
}: CanvasContextMenuProps) {
  const { addNodes, screenToFlowPosition } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [searchValue, setSearchValue] = useState("");

  const handleContextMenu = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const isPane = target.classList.contains("react-flow__pane");
    if (isPane) {
      event.preventDefault();
      setMenuPosition({ x: event.clientX, y: event.clientY });
      setIsOpen(true);
      setSearchValue("");
    }
  }, []);

  const handleAddNode = useCallback(
    (type: string) => {
      const position = screenToFlowPosition({
        x: menuPosition.x,
        y: menuPosition.y,
      });

      const data = createNodeData(type);

      const newNode: Node = {
        id: createUniqueNodeId(type),
        type,
        position,
        data,
      };

      addNodes(newNode);
      onNodeAdd?.(type, position);
      setIsOpen(false);
    },
    [addNodes, menuPosition, onNodeAdd, screenToFlowPosition]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest("[data-canvas-command-menu]")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, NodeRegistryEntry[]>();
    for (const entry of visibleNodeRegistry) {
      const existing = groups.get(entry.category);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(entry.category, [entry]);
      }
    }
    return groups;
  }, []);

  return (
    <div className={cn("relative size-full", className)}>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Canvas requires context menu handler */}
      <div
        className="size-full"
        onContextMenu={handleContextMenu}
        role="application"
      >
        {children}
      </div>

      {isOpen && (
        <div
          className="fixed z-50 overflow-hidden rounded-lg border bg-popover shadow-md"
          data-canvas-command-menu
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            width: 280,
          }}
        >
          <Command shouldFilter>
            <CommandInput
              autoFocus
              onValueChange={setSearchValue}
              placeholder="Search nodes..."
              value={searchValue}
            />
            <CommandList className="no-scrollbar max-h-80 overflow-y-auto">
              <CommandEmpty>No nodes found.</CommandEmpty>
              {Array.from(groupedEntries.entries()).map(
                ([category, entries]) => (
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
                          key={entry.id}
                          onSelect={() => handleAddNode(entry.id)}
                          value={`${entry.label} ${entry.description}`}
                        >
                          <Icon className="mr-2 size-4 text-muted-foreground" />
                          <span>{entry.label}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
});
CanvasContextMenu.displayName = "CanvasContextMenu";
