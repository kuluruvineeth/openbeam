"use client";

import type { Node } from "@xyflow/react";
import { useOnSelectionChange, useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

let groupCounter = 0;
function createGroupId() {
  groupCounter += 1;
  return `group-${Date.now()}-${groupCounter}`;
}

export function useSelectionGrouping() {
  const { getNodes, setNodes, getNodesBounds } = useReactFlow();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setSelectedIds(nodes.map((n) => n.id));
    },
  });

  const groupSelected = useCallback(() => {
    const selected = getNodes().filter((n) => selectedIds.includes(n.id));
    if (selected.length < 2) {
      return;
    }

    const bounds = getNodesBounds(selected);
    const padding = 20;
    const groupId = createGroupId();

    const groupNode: Node = {
      id: groupId,
      type: "group",
      position: { x: bounds.x - padding, y: bounds.y - padding },
      style: {
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
      },
      data: { label: "Group", expanded: true },
    };

    setNodes((ns) => [
      groupNode,
      ...ns.map((n) => {
        if (!selectedIds.includes(n.id)) {
          return n;
        }
        return {
          ...n,
          parentId: groupId,
          extent: "parent" as const,
          position: {
            x: n.position.x - groupNode.position.x,
            y: n.position.y - groupNode.position.y,
          },
        };
      }),
    ]);
  }, [selectedIds, getNodes, getNodesBounds, setNodes]);

  const ungroupSelected = useCallback(() => {
    const nodes = getNodes();
    const selectedGroupIds = nodes
      .filter((n) => selectedIds.includes(n.id) && n.type === "group")
      .map((n) => n.id);

    if (selectedGroupIds.length === 0) {
      return;
    }

    const groupIdSet = new Set(selectedGroupIds);

    setNodes((ns) => {
      const groupPositions = new Map<string, { x: number; y: number }>();
      for (const n of ns) {
        if (groupIdSet.has(n.id)) {
          groupPositions.set(n.id, n.position);
        }
      }

      return ns
        .filter((n) => !groupIdSet.has(n.id))
        .map((n) => {
          if (!(n.parentId && groupIdSet.has(n.parentId))) {
            return n;
          }
          const parentPos = groupPositions.get(n.parentId);
          if (!parentPos) {
            return n;
          }
          return {
            ...n,
            parentId: undefined,
            extent: undefined,
            position: {
              x: n.position.x + parentPos.x,
              y: n.position.y + parentPos.y,
            },
          };
        });
    });
  }, [selectedIds, getNodes, setNodes]);

  useHotkeys("mod+g", (e: KeyboardEvent) => {
    e.preventDefault();
    groupSelected();
  });

  useHotkeys("mod+shift+g", (e: KeyboardEvent) => {
    e.preventDefault();
    ungroupSelected();
  });

  return {
    groupSelected,
    ungroupSelected,
    canGroup: selectedIds.length >= 2,
  };
}
