"use client";

import { useNodeConnections, useNodesData } from "@xyflow/react";
import { useMemo } from "react";

export function useUpstreamData(nodeId: string) {
  const connections = useNodeConnections({ id: nodeId, handleType: "target" });
  const sourceIds = useMemo(
    () => connections.map((c) => c.source),
    [connections]
  );
  const nodesData = useNodesData(sourceIds);

  return useMemo(() => {
    const upstream: Record<string, unknown> = {};
    for (const nd of nodesData) {
      if (nd?.data?.result !== undefined) {
        upstream[nd.id] = nd.data.result;
      }
    }
    return upstream;
  }, [nodesData]);
}
