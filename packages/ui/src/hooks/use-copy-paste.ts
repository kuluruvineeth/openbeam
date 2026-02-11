"use client";

import type { Edge, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

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

export function useCopyPaste() {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();
  const clipboard = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const pasteOffset = useRef(0);

  const copy = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = getEdges().filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
    );
    clipboard.current = { nodes: selectedNodes, edges: selectedEdges };
    pasteOffset.current = 0;
  }, [getNodes, getEdges]);

  const paste = useCallback(() => {
    if (!clipboard.current) {
      return;
    }
    pasteOffset.current += 20;
    const idMapping: Record<string, string> = {};

    const newNodes = clipboard.current.nodes.map((node) => {
      const newId = createUniqueId(node.type ?? "node");
      idMapping[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + pasteOffset.current,
          y: node.position.y + pasteOffset.current,
        },
        selected: true,
      };
    });

    const newEdges = clipboard.current.edges.map((edge) => ({
      ...edge,
      id: createUniqueId("edge"),
      source: idMapping[edge.source] ?? edge.source,
      target: idMapping[edge.target] ?? edge.target,
    }));

    setNodes((ns) => [
      ...ns.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    setEdges((es) => [...es, ...newEdges]);
  }, [setNodes, setEdges]);

  const cut = useCallback(() => {
    copy();
    const selectedIds = new Set(
      getNodes()
        .filter((n) => n.selected)
        .map((n) => n.id)
    );
    setNodes((ns) => ns.filter((n) => !selectedIds.has(n.id)));
    setEdges((es) =>
      es.filter(
        (e) => !(selectedIds.has(e.source) || selectedIds.has(e.target))
      )
    );
  }, [copy, getNodes, setNodes, setEdges]);

  useHotkeys("mod+c", (e: KeyboardEvent) => {
    e.preventDefault();
    copy();
  });
  useHotkeys("mod+v", (e: KeyboardEvent) => {
    e.preventDefault();
    paste();
  });
  useHotkeys("mod+x", (e: KeyboardEvent) => {
    e.preventDefault();
    cut();
  });

  return { copy, cut, paste };
}
