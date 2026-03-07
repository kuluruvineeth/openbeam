"use client";

import type { ConnectionIntent } from "@openbeam/types/canvas";
import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";

const PROXIMITY_THRESHOLD = 150;

const SOURCE_ONLY_TYPES = new Set<string>([
  "start",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
]);

const SINK_ONLY_TYPES = new Set<string>(["end"]);

export interface UseProximityConnectReturn {
  suggestedIntents: ConnectionIntent[];
  onNodeDragStop: (event: MouseEvent, node: Node) => void;
  acceptIntent: (intent: ConnectionIntent) => void;
  dismissIntent: (source: string, target: string) => void;
  clearIntents: () => void;
}

export function computeNodeCenter(node: Node): { x: number; y: number } {
  const width = node.measured?.width ?? 320;
  const height = node.measured?.height ?? 100;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

export function computeDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isTypeCompatible(
  sourceType: string,
  targetType: string
): boolean {
  if (SINK_ONLY_TYPES.has(sourceType)) {
    return false;
  }
  if (SOURCE_ONLY_TYPES.has(targetType)) {
    return false;
  }
  return true;
}

export function computeProximityIntents(
  draggedNode: Node,
  allNodes: Node[],
  threshold: number
): ConnectionIntent[] {
  const draggedCenter = computeNodeCenter(draggedNode);
  const draggedType = draggedNode.type ?? "";
  const intents: ConnectionIntent[] = [];

  for (const node of allNodes) {
    if (node.id === draggedNode.id) {
      continue;
    }

    const nodeCenter = computeNodeCenter(node);
    const distance = computeDistance(draggedCenter, nodeCenter);

    if (distance >= threshold) {
      continue;
    }

    const nodeType = node.type ?? "";
    const confidence = 1 - distance / threshold;

    if (isTypeCompatible(draggedType, nodeType)) {
      intents.push({
        source: draggedNode.id,
        target: node.id,
        confidence,
        inferredFrom: "proximity",
      });
    }

    if (
      isTypeCompatible(nodeType, draggedType) &&
      !isTypeCompatible(draggedType, nodeType)
    ) {
      intents.push({
        source: node.id,
        target: draggedNode.id,
        confidence,
        inferredFrom: "proximity",
      });
    }
  }

  return intents.sort((a, b) => b.confidence - a.confidence);
}

export function useProximityConnect(): UseProximityConnectReturn {
  const { getNodes, addEdges } = useReactFlow();
  const [suggestedIntents, setSuggestedIntents] = useState<ConnectionIntent[]>(
    []
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent, node: Node) => {
      const allNodes = getNodes();
      const intents = computeProximityIntents(
        node,
        allNodes,
        PROXIMITY_THRESHOLD
      );
      setSuggestedIntents(intents);
    },
    [getNodes]
  );

  const acceptIntent = useCallback(
    (intent: ConnectionIntent) => {
      addEdges([
        {
          id: `${intent.source}-${intent.target}`,
          source: intent.source,
          target: intent.target,
          type: "data",
        },
      ]);
      setSuggestedIntents((prev) =>
        prev.filter(
          (i) => !(i.source === intent.source && i.target === intent.target)
        )
      );
    },
    [addEdges]
  );

  const dismissIntent = useCallback((source: string, target: string) => {
    setSuggestedIntents((prev) =>
      prev.filter((i) => !(i.source === source && i.target === target))
    );
  }, []);

  const clearIntents = useCallback(() => {
    setSuggestedIntents([]);
  }, []);

  return {
    suggestedIntents,
    onNodeDragStop,
    acceptIntent,
    dismissIntent,
    clearIntents,
  };
}
