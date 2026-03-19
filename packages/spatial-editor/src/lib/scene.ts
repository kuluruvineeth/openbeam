"use client";

import { useScene } from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import useEditor from "../store/use-editor";

export type SceneGraph = {
  nodes: Record<string, unknown>;
  rootNodeIds: string[];
};

export function syncEditorSelectionFromCurrentScene() {
  // biome-ignore lint/suspicious/noExplicitAny: type cast
  const sceneNodes = useScene.getState().nodes as Record<string, any>;
  const sceneRootIds = useScene.getState().rootNodeIds;
  const siteNode = sceneRootIds[0] ? sceneNodes[sceneRootIds[0]] : null;
  // biome-ignore lint/suspicious/noExplicitAny: type cast
  const resolve = (child: any) =>
    typeof child === "string" ? sceneNodes[child] : child;
  const firstBuilding = siteNode?.children
    ?.map(resolve)
    // biome-ignore lint/suspicious/noExplicitAny: type cast
    .find((n: any) => n?.type === "building");
  const firstLevel = firstBuilding?.children
    ?.map(resolve)
    // biome-ignore lint/suspicious/noExplicitAny: type cast
    .find((n: any) => n?.type === "level");

  if (firstBuilding && firstLevel) {
    useViewer.getState().setSelection({
      buildingId: firstBuilding.id,
      levelId: firstLevel.id,
      selectedIds: [],
      zoneId: null,
    });
    useEditor.getState().setPhase("structure");
    useEditor.getState().setStructureLayer("elements");

    if (!firstLevel.children || firstLevel.children.length === 0) {
      useEditor.getState().setMode("build");
      useEditor.getState().setTool("wall");
    }
  } else {
    useEditor.getState().setPhase("site");
    useViewer.getState().setSelection({
      buildingId: null,
      levelId: null,
      selectedIds: [],
      zoneId: null,
    });
  }
}

export function applySceneGraphToEditor(sceneGraph?: SceneGraph | null) {
  if (sceneGraph?.nodes && sceneGraph.rootNodeIds) {
    const { nodes, rootNodeIds } = sceneGraph;
    // biome-ignore lint/suspicious/noExplicitAny: type cast
    useScene.getState().setScene(nodes as any, rootNodeIds as any);
  } else {
    useScene.getState().clearScene();
  }

  syncEditorSelectionFromCurrentScene();
}

const LOCAL_STORAGE_KEY = "openbeam-spatial-scene";

export function saveSceneToLocalStorage(scene: SceneGraph): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scene));
  } catch {
    (Function.prototype as () => void)();
  }
}

export function loadSceneFromLocalStorage(): SceneGraph | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SceneGraph) : null;
  } catch {
    return null;
  }
}
