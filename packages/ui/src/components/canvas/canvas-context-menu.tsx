"use client";

import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import type { MouseEvent, ReactNode } from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { cn } from "../../utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../command";
import {
  createClassifyNodeData,
  createExtractNodeData,
  createLlmNodeData,
  createRagNodeData,
  createSummarizeNodeData,
} from "./nodes/ai";
import {
  createConditionNodeData,
  createEndNodeData,
  createLoopNodeData,
  createParallelJoinNodeData,
  createParallelSplitNodeData,
  createStartNodeData,
} from "./nodes/control";
import {
  createAnnotationNodeData,
  createApprovalNodeData,
  createInputNodeData,
  createNotifyNodeData,
} from "./nodes/human";
import { categoryLabels, nodeButtons } from "./nodes/node-buttons";
import {
  createCodeNodeData,
  createFilterNodeData,
  createTemplateNodeData,
} from "./nodes/transform";

const ID_COUNTER_LIMIT = 1_000_000;
let lastIdTimestamp = 0;
let idCounter = 0;

function createUniqueId(prefix: string) {
  const timestamp = Date.now();
  if (timestamp !== lastIdTimestamp) {
    lastIdTimestamp = timestamp;
    idCounter = 0;
  } else {
    idCounter = (idCounter + 1) % ID_COUNTER_LIMIT;
  }
  return `${prefix}-${timestamp}-${idCounter}`;
}

const nodeDataFactories: Record<string, () => Record<string, unknown>> = {
  start: createStartNodeData,
  end: createEndNodeData,
  condition: createConditionNodeData,
  loop: createLoopNodeData,
  parallel_split: createParallelSplitNodeData,
  parallel_join: createParallelJoinNodeData,
  llm: createLlmNodeData,
  rag: createRagNodeData,
  summarize: createSummarizeNodeData,
  extract: createExtractNodeData,
  classify: createClassifyNodeData,
  template: createTemplateNodeData,
  code: createCodeNodeData,
  filter: createFilterNodeData,
  approval: createApprovalNodeData,
  input: createInputNodeData,
  annotation: createAnnotationNodeData,
  notify: createNotifyNodeData,
};

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

      const dataFactory = nodeDataFactories[type];
      const data = dataFactory ? dataFactory() : { label: type };

      const newNode: Node = {
        id: createUniqueId(type),
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

  const groupedButtons = nodeButtons.reduce(
    (acc, button) => {
      const category = button.category;
      const categoryArray = acc[category] ?? [];
      categoryArray.push(button);
      acc[category] = categoryArray;
      return acc;
    },
    {} as Record<string, typeof nodeButtons>
  );

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
            <CommandList>
              <CommandEmpty>No nodes found.</CommandEmpty>
              {(
                Object.entries(groupedButtons) as [string, typeof nodeButtons][]
              ).map(([category, buttons]) => (
                <CommandGroup
                  heading={
                    categoryLabels[category as keyof typeof categoryLabels]
                  }
                  key={category}
                >
                  {buttons.map((button) => {
                    const Icon = button.icon;
                    return (
                      <CommandItem
                        key={button.id}
                        onSelect={() => handleAddNode(button.id)}
                        value={`${button.label} ${button.description}`}
                      >
                        <Icon className="mr-2 size-4 text-muted-foreground" />
                        <span>{button.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
});
CanvasContextMenu.displayName = "CanvasContextMenu";
