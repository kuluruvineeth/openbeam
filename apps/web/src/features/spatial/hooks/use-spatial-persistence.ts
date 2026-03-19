"use client";

import type { SceneGraph } from "@openbeam/spatial-editor";
import { useCallback, useState } from "react";
import { loadGuestScene, saveGuestScene } from "../lib/spatial-helpers";

export function useSpatialPersistence(sceneId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const loadScene = useCallback((): Promise<SceneGraph | null> => {
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
    (sceneGraph: SceneGraph): Promise<void> => {
      setSaveStatus("saving");
      try {
        if (sceneId) {
          setSaveStatus("saved");
          return Promise.resolve();
        }

        saveGuestScene(sceneGraph);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
      return Promise.resolve();
    },
    [sceneId]
  );

  return { loadScene, saveScene: handleSave, saveStatus, isLoading };
}
