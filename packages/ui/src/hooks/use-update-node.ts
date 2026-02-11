"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

export function useUpdateNode(nodeId: string) {
  const { setNodes } = useReactFlow();

  const updateData = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        )
      );
    },
    [nodeId, setNodes]
  );

  return { updateData };
}
