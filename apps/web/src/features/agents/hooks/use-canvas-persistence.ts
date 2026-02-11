"use client";

import { useCanvasStore, useDebounce } from "@openplane/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";

interface UseCanvasPersistenceOptions {
  autoSave?: boolean;
  autoSaveDelayMs?: number;
}

interface UseCanvasPersistenceReturn {
  save: () => Promise<void>;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
  error: unknown;
}

export function useCanvasPersistence(
  canvasId: string,
  options: UseCanvasPersistenceOptions = {}
): UseCanvasPersistenceReturn {
  const { autoSave = true, autoSaveDelayMs = 500 } = options;

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isDirty = useCanvasStore((s) => s.isDirty);
  const markClean = useCanvasStore((s) => s.markClean);
  const setCanvasId = useCanvasStore((s) => s.setCanvasId);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debouncedIsDirty = useDebounce(isDirty, autoSaveDelayMs);

  const updateMutation = useMutation(
    trpc.agentCanvas.update.mutationOptions({
      onSuccess: () => {
        markClean();
        setLastSavedAt(new Date());
        queryClient.invalidateQueries({
          queryKey: trpc.agentCanvas.get.queryKey({ canvasId }),
        });
      },
    })
  );

  const save = useCallback(async () => {
    const state = useCanvasStore.getState();

    if (!state.isDirty || updateMutation.isPending) {
      return;
    }

    await updateMutation.mutateAsync({
      canvasId,
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
    });
  }, [canvasId, updateMutation]);

  useEffect(() => {
    setCanvasId(canvasId);
    return () => setCanvasId(null);
  }, [canvasId, setCanvasId]);

  useEffect(() => {
    if (!autoSave) {
      return;
    }
    if (!debouncedIsDirty) {
      return;
    }

    save();
  }, [autoSave, debouncedIsDirty, save]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return {
    save,
    isSaving: updateMutation.isPending,
    isDirty,
    lastSavedAt,
    error: updateMutation.error,
  };
}
