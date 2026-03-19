"use client";

import {
  initSpaceDetectionSync,
  initSpatialGridSync,
  useScene,
} from "@openbeam/spatial-core";
import { InteractiveSystem, useViewer, Viewer } from "@openbeam/spatial-viewer";
import { type ReactNode, useEffect, useState } from "react";
import { ViewerOverlay } from "../../components/viewer-overlay";
import { ViewerZoneSystem } from "../../components/viewer-zone-system";
import {
  type PresetsAdapter,
  PresetsProvider,
} from "../../contexts/presets-context";
import { type SaveStatus, useAutoSave } from "../../hooks/use-auto-save";
import { useKeyboard } from "../../hooks/use-keyboard";
import {
  applySceneGraphToEditor,
  loadSceneFromLocalStorage,
  type SceneGraph,
} from "../../lib/scene";
import { initSFXBus } from "../../lib/sfx-bus";
import useEditor from "../../store/use-editor";
import { CeilingSystem } from "../systems/ceiling/ceiling-system";
import { ZoneLabelEditorSystem } from "../systems/zone/zone-label-editor-system";
import { ZoneSystem } from "../systems/zone/zone-system";
import { ToolManager } from "../tools/tool-manager";
import { ActionMenu } from "../ui/action-menu";
import { HelperManager } from "../ui/helpers/helper-manager";
import { PanelManager } from "../ui/panels/panel-manager";
import { ErrorBoundary } from "../ui/primitives/error-boundary";
import { SceneLoader } from "../ui/scene-loader";
import { CustomCameraControls } from "./custom-camera-controls";
import { ExportManager } from "./export-manager";
import { FloatingActionMenu } from "./floating-action-menu";
import { Grid } from "./grid";
import { PresetThumbnailGenerator } from "./preset-thumbnail-generator";
import { SelectionManager } from "./selection-manager";
import { SiteEdgeLabels } from "./site-edge-labels";
import { ThumbnailGenerator } from "./thumbnail-generator";

useScene.getState().loadScene();
initSpatialGridSync();
initSpaceDetectionSync(
  useScene as Parameters<typeof initSpaceDetectionSync>[0],
  useEditor as Parameters<typeof initSpaceDetectionSync>[1]
);

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
}

initSFXBus();

export interface EditorProps {
  appMenuButton?: ReactNode;

  onLoad?: () => Promise<SceneGraph | null>;
  onSave?: (scene: SceneGraph) => Promise<void>;
  onDirty?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;

  previewScene?: SceneGraph;
  isVersionPreviewMode?: boolean;

  isLoading?: boolean;

  onThumbnailCapture?: (blob: Blob) => void;

  presetsAdapter?: PresetsAdapter;
}

function EditorSceneCrashFallback() {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#242422]/90 p-4 text-foreground">
      <div className="w-full max-w-md rounded-[20px] border border-[#3b3b36] bg-[#242422] p-6 shadow-[0_8px_28px_rgba(0,0,0,0.35),0_1px_6px_rgba(0,0,0,0.25)]">
        <h2 className="font-semibold text-[#ccc9c0] text-lg">
          The editor scene failed to render
        </h2>
        <p className="mt-2 text-[#76766e] text-sm">
          You can retry the scene or return home without reloading the whole app
          shell.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            className="rounded-md border border-[#3b3b36] bg-[#353530] px-3 py-2 font-medium text-[#ccc9c0] text-sm hover:bg-[#42423d]"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload editor
          </button>
          <a
            className="rounded-md border border-[#3b3b36] bg-[#292927] px-3 py-2 font-medium text-[#76766e] text-sm hover:bg-[#353530] hover:text-[#ccc9c0]"
            href="/"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Editor({
  appMenuButton,
  onLoad,
  onSave,
  onDirty,
  onSaveStatusChange,
  previewScene,
  isVersionPreviewMode = false,
  isLoading = false,
  onThumbnailCapture,
  presetsAdapter,
}: EditorProps) {
  useKeyboard();

  const { isLoadingSceneRef } = useAutoSave({
    onSave,
    onDirty,
    onSaveStatusChange,
    isVersionPreviewMode,
  });

  const [isSceneLoading, setIsSceneLoading] = useState(false);
  const isPreviewMode = useEditor((s) => s.isPreviewMode);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      isLoadingSceneRef.current = true;
      setIsSceneLoading(true);

      try {
        const sceneGraph = onLoad
          ? await onLoad()
          : loadSceneFromLocalStorage();
        if (!cancelled) {
          applySceneGraphToEditor(sceneGraph);
        }
      } catch {
        if (!cancelled) {
          applySceneGraphToEditor(null);
        }
      } finally {
        if (!cancelled) {
          setIsSceneLoading(false);
          requestAnimationFrame(() => {
            isLoadingSceneRef.current = false;
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [onLoad, isLoadingSceneRef]);

  useEffect(() => {
    if (isVersionPreviewMode && previewScene) {
      applySceneGraphToEditor(previewScene);
    }
  }, [isVersionPreviewMode, previewScene]);

  const showLoader = isLoading || isSceneLoading;

  return (
    <PresetsProvider adapter={presetsAdapter}>
      <div className="dark h-full w-full text-[#ccc9c0]">
        {showLoader && <SceneLoader />}

        {isPreviewMode ? (
          <ViewerOverlay
            onBack={() => useEditor.getState().setPreviewMode(false)}
          />
        ) : (
          <>
            <ActionMenu />
            <PanelManager />
            <HelperManager />

            <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between p-4">
              <div className="pointer-events-auto flex items-center gap-2">
                {appMenuButton}
              </div>
            </div>
          </>
        )}

        <ErrorBoundary fallback={<EditorSceneCrashFallback />}>
          <Viewer selectionManager={isPreviewMode ? "default" : "custom"}>
            {!isPreviewMode && <SelectionManager />}
            {!isPreviewMode && <FloatingActionMenu />}
            <ExportManager />
            {isPreviewMode ? <ViewerZoneSystem /> : <ZoneSystem />}
            <CeilingSystem />
            {!isPreviewMode && (
              <Grid cellColor="#aaa" fadeDistance={500} sectionColor="#ccc" />
            )}
            {!isPreviewMode && <ToolManager />}
            <CustomCameraControls />
            <ThumbnailGenerator onThumbnailCapture={onThumbnailCapture} />
            <PresetThumbnailGenerator />
            {!isPreviewMode && <SiteEdgeLabels />}
            {isPreviewMode && <InteractiveSystem />}
          </Viewer>
          {!isPreviewMode && <ZoneLabelEditorSystem />}
        </ErrorBoundary>
      </div>
    </PresetsProvider>
  );
}
