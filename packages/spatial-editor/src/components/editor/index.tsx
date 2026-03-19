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
import { SidebarProvider } from "../ui/primitives/sidebar";
import { SceneLoader } from "../ui/scene-loader";
import { AppSidebar } from "../ui/sidebar/app-sidebar";
import type { SettingsPanelProps } from "../ui/sidebar/panels/settings-panel";
import type { SitePanelProps } from "../ui/sidebar/panels/site-panel";
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
  sidebarTop?: ReactNode;

  onLoad?: () => Promise<SceneGraph | null>;
  onSave?: (scene: SceneGraph) => Promise<void>;
  onDirty?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;

  previewScene?: SceneGraph;
  isVersionPreviewMode?: boolean;

  isLoading?: boolean;

  onThumbnailCapture?: (blob: Blob) => void;

  settingsPanelProps?: SettingsPanelProps;
  sitePanelProps?: SitePanelProps;

  presetsAdapter?: PresetsAdapter;
}

function EditorSceneCrashFallback() {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/95 p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-6 shadow-xl">
        <h2 className="font-semibold text-lg">
          The editor scene failed to render
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">
          You can retry the scene or return home without reloading the whole app
          shell.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            className="rounded-md border border-border bg-accent px-3 py-2 font-medium text-sm hover:bg-accent/80"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload editor
          </button>
          <a
            className="rounded-md border border-border bg-background px-3 py-2 font-medium text-sm hover:bg-accent/40"
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
  sidebarTop,
  onLoad,
  onSave,
  onDirty,
  onSaveStatusChange,
  previewScene,
  isVersionPreviewMode = false,
  isLoading = false,
  onThumbnailCapture,
  settingsPanelProps,
  sitePanelProps,
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

  useEffect(() => {
    document.body.classList.add("dark");
    return () => {
      document.body.classList.remove("dark");
    };
  }, []);

  const showLoader = isLoading || isSceneLoading;

  return (
    <PresetsProvider adapter={presetsAdapter}>
      <div className="dark h-full w-full text-foreground">
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

            <SidebarProvider className="fixed z-20">
              <AppSidebar
                appMenuButton={appMenuButton}
                settingsPanelProps={settingsPanelProps}
                sidebarTop={sidebarTop}
                sitePanelProps={sitePanelProps}
              />
            </SidebarProvider>
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
