"use client";

import type { AgentCanvasEdge, AgentCanvasNode } from "@openplane/types/canvas";
import { useCallback, useRef, useState } from "react";

interface CanvasSnapshot {
  nodes: AgentCanvasNode[];
  edges: AgentCanvasEdge[];
}

interface UseCanvasHistoryOptions {
  maxHistory?: number;
}

interface UseCanvasHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  pushSnapshot: (snapshot: CanvasSnapshot) => void;
  undo: () => CanvasSnapshot | undefined;
  redo: () => CanvasSnapshot | undefined;
  clear: () => void;
}

const DEFAULT_MAX_HISTORY = 50;

export function useCanvasHistory(
  options: UseCanvasHistoryOptions = {}
): UseCanvasHistoryReturn {
  const { maxHistory = DEFAULT_MAX_HISTORY } = options;

  const undoStackRef = useRef<CanvasSnapshot[]>([]);
  const redoStackRef = useRef<CanvasSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const pushSnapshot = useCallback(
    (snapshot: CanvasSnapshot) => {
      undoStackRef.current.push({
        nodes: structuredClone(snapshot.nodes),
        edges: structuredClone(snapshot.edges),
      });

      if (undoStackRef.current.length > maxHistory) {
        undoStackRef.current.shift();
      }

      redoStackRef.current = [];
      updateState();
    },
    [maxHistory, updateState]
  );

  const undo = useCallback(() => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) {
      return;
    }

    redoStackRef.current.push(snapshot);
    updateState();

    const previous = undoStackRef.current.at(-1);
    return previous
      ? {
          nodes: structuredClone(previous.nodes),
          edges: structuredClone(previous.edges),
        }
      : undefined;
  }, [updateState]);

  const redo = useCallback(() => {
    const snapshot = redoStackRef.current.pop();
    if (!snapshot) {
      return;
    }

    undoStackRef.current.push(snapshot);
    updateState();

    return {
      nodes: structuredClone(snapshot.nodes),
      edges: structuredClone(snapshot.edges),
    };
  }, [updateState]);

  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    updateState();
  }, [updateState]);

  return {
    canUndo,
    canRedo,
    pushSnapshot,
    undo,
    redo,
    clear,
  };
}

export type { CanvasSnapshot, UseCanvasHistoryOptions, UseCanvasHistoryReturn };
