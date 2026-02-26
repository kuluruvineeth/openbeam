"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "../icons";

const ExcalidrawCanvas = dynamic(() => import("./excalidraw-canvas"), {
  ssr: false,
});

type ExcalidrawFile = {
  type: "excalidraw";
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

type ExcalidrawViewerProps = {
  src: string;
  caption?: string;
  height?: number;
};

function FullscreenOverlay({
  data,
  theme,
  onClose,
}: {
  data: ExcalidrawFile;
  theme: "light" | "dark";
  onClose: () => void;
}) {
  useHotkeys("escape", onClose, { enableOnFormTags: true });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        background: theme === "dark" ? "#121212" : "#ffffff",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10_000,
        }}
      >
        <button
          aria-label="Exit fullscreen"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 6,
            border: `1px solid ${theme === "dark" ? "#333" : "#ddd"}`,
            background: theme === "dark" ? "#1e1e1e" : "#f5f5f5",
            color: theme === "dark" ? "#ccc" : "#444",
            cursor: "pointer",
          }}
          type="button"
        >
          <Icons.Close size={16} />
        </button>
      </div>
      <div style={{ flex: 1, width: "100%", height: "100%" }}>
        <ExcalidrawCanvas
          appState={data.appState}
          elements={data.elements}
          files={data.files}
          interactive
          theme={theme}
        />
      </div>
    </div>,
    document.body
  );
}

export function ExcalidrawViewer({
  src,
  caption,
  height = 600,
}: ExcalidrawViewerProps): React.ReactElement {
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<ExcalidrawFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(src, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load ${src}: ${res.status}`);
        }
        return res.json();
      })
      .then((json: ExcalidrawFile) => {
        setData(json);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") {
          return;
        }
        setError(err.message);
      });

    return () => {
      controller.abort();
    };
  }, [src]);

  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  if (error) {
    return (
      <div className="my-6 flex h-32 items-center justify-center rounded-lg border border-fd-border bg-fd-muted/30">
        <div className="text-fd-muted-foreground text-sm">
          Failed to load diagram
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="my-6 flex items-center justify-center rounded-lg border border-fd-border bg-fd-muted/30"
        style={{ height }}
      >
        <div className="text-fd-muted-foreground text-sm">
          Loading diagram...
        </div>
      </div>
    );
  }

  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <figure className="my-6">
      <div
        className="excalidraw-viewer-container relative rounded-md border border-fd-border"
        style={{ height, width: "100%" }}
      >
        <ExcalidrawCanvas
          appState={data.appState}
          elements={data.elements}
          files={data.files}
          theme={theme}
        />
        <button
          aria-label="Open fullscreen"
          className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-md border border-fd-border bg-fd-card px-2.5 py-1.5 text-fd-muted-foreground text-xs transition-colors hover:bg-fd-accent hover:text-fd-foreground"
          onClick={() => setFullscreen(true)}
          type="button"
        >
          <Icons.Fullscreen size={14} />
          Open in Excalidraw
        </button>
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-fd-muted-foreground text-sm">
          {caption}
        </figcaption>
      )}
      {fullscreen && (
        <FullscreenOverlay
          data={data}
          onClose={closeFullscreen}
          theme={theme}
        />
      )}
    </figure>
  );
}
