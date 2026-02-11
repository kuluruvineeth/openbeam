"use client";

import type { Connection, Edge } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useDAGValidation } from "./use-dag-validation";

const SOURCE_ONLY_TYPES = new Set<string>([
  "start",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
]);

const SINK_ONLY_TYPES = new Set<string>(["end"]);

export function useConnectionValidation() {
  const { getNode } = useReactFlow();
  const { isValidConnection: isDAGValid } = useDAGValidation();

  const isValidConnection = useCallback(
    (connection: Edge | Connection): boolean => {
      if (!isDAGValid(connection)) {
        return false;
      }

      const sourceNode = getNode(connection.source);
      const targetNode = getNode(connection.target);
      if (!(sourceNode && targetNode)) {
        return false;
      }

      if (SINK_ONLY_TYPES.has(sourceNode.type ?? "")) {
        return false;
      }
      if (SOURCE_ONLY_TYPES.has(targetNode.type ?? "")) {
        return false;
      }

      return true;
    },
    [isDAGValid, getNode]
  );

  return { isValidConnection };
}
