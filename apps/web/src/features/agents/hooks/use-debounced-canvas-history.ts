import type { AgentCanvasEdge, AgentCanvasNode } from "@openplane/types/canvas";
import { useCanvasHistory } from "@openplane/ui";
import { useCallback, useEffect, useRef } from "react";
import { DEBOUNCE_DELAYS } from "@/lib/constants/polling";

export function useDebouncedCanvasHistory(
  nodes: AgentCanvasNode[],
  edges: AgentCanvasEdge[]
) {
  const history = useCanvasHistory({ maxHistory: 50 });
  const lastSnapshotRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const snapshot = JSON.stringify({ nodes, edges });
    if (snapshot !== lastSnapshotRef.current && nodes.length > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        history.pushSnapshot({ nodes, edges });
        lastSnapshotRef.current = snapshot;
      }, DEBOUNCE_DELAYS.CANVAS_HISTORY);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, history]);

  const handleUndo = useCallback(
    (
      setNodes: (updatedNodes: AgentCanvasNode[]) => void,
      setEdges: (updatedEdges: AgentCanvasEdge[]) => void
    ) => {
      const snapshot = history.undo();
      if (snapshot) {
        setNodes(snapshot.nodes as AgentCanvasNode[]);
        setEdges(snapshot.edges as AgentCanvasEdge[]);
        lastSnapshotRef.current = JSON.stringify(snapshot);
      }
    },
    [history]
  );

  const handleRedo = useCallback(
    (
      setNodes: (updatedNodes: AgentCanvasNode[]) => void,
      setEdges: (updatedEdges: AgentCanvasEdge[]) => void
    ) => {
      const snapshot = history.redo();
      if (snapshot) {
        setNodes(snapshot.nodes as AgentCanvasNode[]);
        setEdges(snapshot.edges as AgentCanvasEdge[]);
        lastSnapshotRef.current = JSON.stringify(snapshot);
      }
    },
    [history]
  );

  return {
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    handleUndo,
    handleRedo,
  };
}
