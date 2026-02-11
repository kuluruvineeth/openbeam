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
import { Icons } from "../icons";
import { createNodeData, createUniqueNodeId } from "./nodes/factory";
import {
  CATEGORY_LABELS,
  type NodeRegistryEntry,
  visibleNodeRegistry,
} from "./nodes/registry";

type MenuTarget =
  | { type: "pane" }
  | { type: "node"; nodeId: string; nodeType: string }
  | { type: "edge"; edgeId: string };

interface CanvasContextMenuProps {
  children: ReactNode;
  className?: string;
  onNodeAdd?: (type: string, position: { x: number; y: number }) => void;
  onNodeDuplicate?: (nodeId: string) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeTest?: (nodeId: string) => void;
  onNodeGroup?: (nodeId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onEdgeToggle?: (edgeId: string) => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onLayout?: () => void;
}

export const CanvasContextMenu = memo(function CanvasContextMenuComponent({
  children,
  className,
  onNodeAdd,
  onNodeDuplicate,
  onNodeDelete,
  onNodeTest,
  onNodeGroup,
  onEdgeDelete,
  onEdgeToggle,
  onPaste,
  onSelectAll,
  onLayout,
}: CanvasContextMenuProps) {
  const { addNodes, screenToFlowPosition } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuTarget, setMenuTarget] = useState<MenuTarget>({ type: "pane" });
  const [searchValue, setSearchValue] = useState("");

  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setSearchValue("");

    const nodeEl = target.closest(".react-flow__node");
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute("data-id") ?? "";
      const nodeType = nodeEl.getAttribute("data-type") ?? "";
      setMenuTarget({ type: "node", nodeId, nodeType });
      setIsOpen(true);
      return;
    }

    const edgeEl = target.closest(".react-flow__edge");
    if (edgeEl) {
      const edgeId = edgeEl.getAttribute("data-id") ?? "";
      setMenuTarget({ type: "edge", edgeId });
      setIsOpen(true);
      return;
    }

    const isPane = target.classList.contains("react-flow__pane");
    if (isPane) {
      setMenuTarget({ type: "pane" });
      setIsOpen(true);
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
        aria-label="Canvas"
        className="size-full"
        onContextMenu={handleContextMenu}
        role="application"
      >
        {children}
      </div>

      {isOpen && (
        <div
          className="fixed z-50 overflow-hidden rounded-md border bg-popover shadow-sm"
          data-canvas-command-menu
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            minWidth: menuTarget.type === "pane" ? 280 : 180,
          }}
        >
          {menuTarget.type === "node" && (
            <div className="flex flex-col py-1">
              {onNodeTest && (
                <ContextMenuItem
                  icon={<Icons.Play size={14} />}
                  label="Test node"
                  onClick={() => {
                    onNodeTest(menuTarget.nodeId);
                    setIsOpen(false);
                  }}
                />
              )}
              {onNodeDuplicate && (
                <ContextMenuItem
                  icon={<Icons.Copy size={14} />}
                  label="Duplicate"
                  onClick={() => {
                    onNodeDuplicate(menuTarget.nodeId);
                    setIsOpen(false);
                  }}
                  shortcut="⌘D"
                />
              )}
              {onNodeGroup && (
                <ContextMenuItem
                  icon={<Icons.GitBranch size={14} />}
                  label="Group"
                  onClick={() => {
                    onNodeGroup(menuTarget.nodeId);
                    setIsOpen(false);
                  }}
                  shortcut="⌘G"
                />
              )}
              <div className="mx-1 my-0.5 h-px bg-border/50" />
              {onNodeDelete && (
                <ContextMenuItem
                  icon={<Icons.Trash size={14} />}
                  label="Delete"
                  onClick={() => {
                    onNodeDelete(menuTarget.nodeId);
                    setIsOpen(false);
                  }}
                  shortcut="⌫"
                  variant="destructive"
                />
              )}
            </div>
          )}

          {menuTarget.type === "edge" && (
            <div className="flex flex-col py-1">
              {onEdgeToggle && (
                <ContextMenuItem
                  icon={<Icons.Settings2 size={14} />}
                  label="Toggle enabled"
                  onClick={() => {
                    onEdgeToggle(menuTarget.edgeId);
                    setIsOpen(false);
                  }}
                />
              )}
              <div className="mx-1 my-0.5 h-px bg-border/50" />
              {onEdgeDelete && (
                <ContextMenuItem
                  icon={<Icons.Trash size={14} />}
                  label="Delete edge"
                  onClick={() => {
                    onEdgeDelete(menuTarget.edgeId);
                    setIsOpen(false);
                  }}
                  variant="destructive"
                />
              )}
            </div>
          )}

          {menuTarget.type === "pane" && (
            <Command shouldFilter>
              <CommandInput
                autoFocus
                onValueChange={setSearchValue}
                placeholder="Search nodes..."
                value={searchValue}
              />
              <CommandList className="no-scrollbar max-h-80 overflow-y-auto">
                <CommandEmpty>No nodes found.</CommandEmpty>
                {onPaste && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        onPaste();
                        setIsOpen(false);
                      }}
                      value="Paste"
                    >
                      <Icons.Copy className="mr-2 size-4 text-muted-foreground" />
                      <span>Paste</span>
                      <span className="ml-auto text-muted-foreground text-xs">
                        ⌘V
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}
                {(onSelectAll || onLayout) && (
                  <CommandGroup>
                    {onSelectAll && (
                      <CommandItem
                        onSelect={() => {
                          onSelectAll();
                          setIsOpen(false);
                        }}
                        value="Select All"
                      >
                        <Icons.CheckIcon className="mr-2 size-4 text-muted-foreground" />
                        <span>Select all</span>
                        <span className="ml-auto text-muted-foreground text-xs">
                          ⌘A
                        </span>
                      </CommandItem>
                    )}
                    {onLayout && (
                      <CommandItem
                        onSelect={() => {
                          onLayout();
                          setIsOpen(false);
                        }}
                        value="Auto Layout"
                      >
                        <Icons.GitMerge className="mr-2 size-4 text-muted-foreground" />
                        <span>Auto layout</span>
                        <span className="ml-auto text-muted-foreground text-xs">
                          L
                        </span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                )}
                {Array.from(groupedEntries.entries()).map(
                  ([category, entries]) => (
                    <CommandGroup
                      heading={
                        CATEGORY_LABELS[
                          category as keyof typeof CATEGORY_LABELS
                        ]
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
          )}
        </div>
      )}
    </div>
  );
});
CanvasContextMenu.displayName = "CanvasContextMenu";

const ContextMenuItem = memo(function ContextMenuItemComponent({
  icon,
  label,
  onClick,
  shortcut,
  variant,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
  variant?: "destructive";
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        variant === "destructive" &&
          "hover:bg-destructive/10 hover:text-destructive"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
      {shortcut && (
        <span className="ml-auto text-muted-foreground text-xs">
          {shortcut}
        </span>
      )}
    </button>
  );
});
ContextMenuItem.displayName = "ContextMenuItem";
