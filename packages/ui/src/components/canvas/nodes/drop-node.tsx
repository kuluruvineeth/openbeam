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
import {
  createClassifyNodeData,
  createExtractNodeData,
  createLlmNodeData,
  createRagNodeData,
  createSummarizeNodeData,
} from "./ai";
import {
  createConditionNodeData,
  createEndNodeData,
  createLoopNodeData,
  createParallelJoinNodeData,
  createParallelSplitNodeData,
  createStartNodeData,
} from "./control";
import {
  createAnnotationNodeData,
  createApprovalNodeData,
  createInputNodeData,
  createNotifyNodeData,
} from "./human";
import { categoryLabels, nodeButtons } from "./node-buttons";
import {
  createCodeNodeData,
  createFilterNodeData,
  createTemplateNodeData,
} from "./transform";

export interface DropNodeData {
  isSource?: boolean;
  position?: XYPosition;
}

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

      const newNodeId = createUniqueId(type);
      const dataFactory = nodeDataFactories[type];
      const nodeData = dataFactory ? dataFactory() : { label: type };

      addNodes({
        id: newNodeId,
        type,
        position,
        data: nodeData,
        origin: [0, 0.5],
      });

      for (const sourceNode of sourceNodes) {
        addEdges({
          id: createUniqueId(`edge-${sourceNode.source}-${newNodeId}`),
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
          {(
            Object.entries(groupedButtons) as [string, typeof nodeButtons][]
          ).map(([category, buttons]) => (
            <CommandGroup
              heading={categoryLabels[category as keyof typeof categoryLabels]}
              key={category}
            >
              {buttons.map((button) => {
                const Icon = button.icon;
                return (
                  <CommandItem
                    className="flex items-center gap-2"
                    key={button.id}
                    onSelect={() => handleSelect(button.id)}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm">{button.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {button.description}
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
