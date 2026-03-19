"use client";

import type { SpatialSceneGraph } from "@openbeam/types/spatial";
import { useCallback, useState } from "react";
import { loadGuestScene, saveGuestScene } from "../lib/spatial-helpers";

export function useSpatialPersistence(sceneId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const loadScene = useCallback((): Promise<SpatialSceneGraph | null> => {
    if (sceneId) {
      setIsLoading(true);
      try {
        return Promise.resolve(null);
      } finally {
        setIsLoading(false);
      }
    }

    return Promise.resolve(loadGuestScene());
  }, [sceneId]);

  const handleSave = useCallback(
    (sceneGraph: SpatialSceneGraph) => {
      setSaveStatus("saving");
      try {
        if (sceneId) {
          setSaveStatus("saved");
          return;
        }

        saveGuestScene(sceneGraph);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [sceneId]
  );

  return { loadScene, saveScene: handleSave, saveStatus, isLoading };
}
