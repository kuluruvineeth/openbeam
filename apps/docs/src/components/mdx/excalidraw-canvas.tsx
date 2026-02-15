"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

type ExcalidrawCanvasProps = {
  elements: readonly unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
  theme: "light" | "dark";
  interactive?: boolean;
};

const VIEWER_UI_OPTIONS = {
  canvasActions: {
    changeViewBackgroundColor: false,
    clearCanvas: false,
    export: false as const,
    loadScene: false,
    saveToActiveFile: false,
    saveAsImage: false,
    toggleTheme: false,
  },
  tools: { image: false },
};

const INTERACTIVE_UI_OPTIONS = {
  canvasActions: {
    changeViewBackgroundColor: false,
    clearCanvas: false,
    loadScene: false,
    saveToActiveFile: false,
    toggleTheme: false,
  },
};

export default function ExcalidrawCanvas({
  elements,
  appState,
  files,
  theme,
  interactive = false,
}: ExcalidrawCanvasProps) {
  return (
    <Excalidraw
      autoFocus={interactive}
      excalidrawAPI={(api) => {
        requestAnimationFrame(() => {
          api.scrollToContent(api.getSceneElements(), {
            fitToViewport: true,
            viewportZoomFactor: 0.85,
            animate: false,
          });
        });
      }}
      gridModeEnabled={false}
      handleKeyboardGlobally={interactive}
      initialData={{
        elements: elements as never,
        appState: {
          ...(appState ?? {}),
          viewModeEnabled: !interactive,
          theme,
        },
        scrollToContent: true,
        files: files as never,
      }}
      theme={theme}
      UIOptions={interactive ? INTERACTIVE_UI_OPTIONS : VIEWER_UI_OPTIONS}
      viewModeEnabled={!interactive}
    />
  );
}
