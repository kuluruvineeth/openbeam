"use client";

import type { Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";

const SOURCE_ONLY_TYPES = new Set<string>([
  "start",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
]);

const SINK_ONLY_TYPES = new Set<string>(["end"]);

export interface OnConnectStartParams {
  nodeId: string | null;
  handleType: "source" | "target" | null;
}

export interface UseEasyConnectReturn {
  validTargetIds: string[];
  isConnecting: boolean;
  onConnectStart: (
    event: MouseEvent | TouchEvent,
    params: OnConnectStartParams
  ) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent) => void;
}

function isCompatibleTarget(
  source: Node,
  target: Node,
  handleType: "source" | "target" | null
): boolean {
  if (source.id === target.id) {
    return false;
  }

  const sourceType = source.type ?? "";
  const targetType = target.type ?? "";

  if (handleType === "source") {
    return !(
      SOURCE_ONLY_TYPES.has(targetType) || SINK_ONLY_TYPES.has(sourceType)
    );
  }

  return !(
    SINK_ONLY_TYPES.has(targetType) || SOURCE_ONLY_TYPES.has(sourceType)
  );
}

export function computeValidTargets(
  sourceId: string,
  handleType: "source" | "target" | null,
  nodes: Node[]
): string[] {
  const source = nodes.find((n) => n.id === sourceId);
  if (!source) {
    return [];
  }

  const targets: string[] = [];
  for (const node of nodes) {
    if (isCompatibleTarget(source, node, handleType)) {
      targets.push(node.id);
    }
  }
  return targets;
}

export function useEasyConnect(): UseEasyConnectReturn {
  const { getNodes } = useReactFlow();
  const [validTargetIds, setValidTargetIds] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      if (!params.nodeId) {
        return;
      }
      setIsConnecting(true);
      const nodes = getNodes();
      setValidTargetIds(
        computeValidTargets(params.nodeId, params.handleType, nodes)
      );
    },
    [getNodes]
  );

  const onConnectEnd = useCallback((_event: MouseEvent | TouchEvent) => {
    setIsConnecting(false);
    setValidTargetIds([]);
  }, []);

  return { validTargetIds, isConnecting, onConnectStart, onConnectEnd };
}
