"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowExpandDiagonal01Icon,
  ArrowShrink01Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import type mermaid from "mermaid";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const mermaidPromise = import("mermaid").then((m) => {
  m.default.initialize({
    startOnLoad: false,
    theme: "default",
  });
  return m.default;
});

export function Mermaid({ chart }: { chart: string }): React.ReactElement {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const render = async (mermaidInstance: typeof mermaid) => {
      mermaidInstance.initialize({
        startOnLoad: false,
        theme: resolvedTheme === "dark" ? "dark" : "default",
      });
      const result = await mermaidInstance.render(
        id.replaceAll(":", "_"),
        chart
      );
      setSvg(result.svg);
    };

    mermaidPromise.then(render).catch(console.error);
  }, [chart, id, resolvedTheme]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    if (!isFullscreen) {
      setZoom(1);
    }
  }, [isFullscreen]);

  const exitFullscreen = useCallback(() => {
    if (isFullscreen) {
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  const isActive = isFullscreen || isFocused;

  useHotkeys("equal, plus", handleZoomIn, { enabled: isActive }, [isActive]);
  useHotkeys("minus", handleZoomOut, { enabled: isActive }, [isActive]);
  useHotkeys("0", handleResetZoom, { enabled: isActive }, [isActive]);
  useHotkeys("f", toggleFullscreen, { enabled: isActive }, [
    isActive,
    toggleFullscreen,
  ]);
  useHotkeys("escape", exitFullscreen, { enabled: isFullscreen }, [
    isFullscreen,
    exitFullscreen,
  ]);

  if (!svg) {
    return (
      <div className="my-6 flex h-32 items-center justify-center rounded-lg border border-fd-border bg-fd-muted/30">
        <div className="text-fd-muted-foreground text-sm">
          Loading diagram...
        </div>
      </div>
    );
  }

  return (
    /* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Interactive diagram viewer with keyboard shortcuts */
    <div
      aria-label="Mermaid diagram viewer"
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-fd-background"
          : "group relative my-6 rounded-lg border border-fd-border bg-fd-card focus-within:ring-2 focus-within:ring-fd-ring"
      }
      onBlur={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      ref={containerRef}
      role="application"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Focusable for keyboard navigation
      tabIndex={0}
    >
      <div
        className={`flex items-center justify-between border-fd-border border-b px-2 py-1.5 ${isFullscreen ? "" : "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"}`}
      >
        <div className="text-fd-muted-foreground text-xs">
          {isActive && (
            <span className="hidden sm:inline">
              <kbd className="rounded bg-fd-muted px-1">+</kbd> /{" "}
              <kbd className="rounded bg-fd-muted px-1">-</kbd> zoom •{" "}
              <kbd className="rounded bg-fd-muted px-1">0</kbd> reset •{" "}
              <kbd className="rounded bg-fd-muted px-1">F</kbd> fullscreen
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            onClick={handleZoomOut}
            title="Zoom out (-)"
            type="button"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={ZoomOutAreaIcon}
              size={16}
              strokeWidth={1.5}
            />
          </button>
          <button
            className="min-w-[3rem] rounded px-2 py-1 text-fd-muted-foreground text-xs transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            onClick={handleResetZoom}
            title="Reset zoom (0)"
            type="button"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="rounded p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            onClick={handleZoomIn}
            title="Zoom in (+)"
            type="button"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={ZoomInAreaIcon}
              size={16}
              strokeWidth={1.5}
            />
          </button>
          <div className="mx-1 h-4 w-px bg-fd-border" />
          <button
            className="rounded p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F)"}
            type="button"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={
                isFullscreen ? ArrowShrink01Icon : ArrowExpandDiagonal01Icon
              }
              size={16}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>
      <div
        className={`overflow-auto ${isFullscreen ? "flex-1" : "max-h-[600px]"}`}
      >
        <div
          className="flex min-h-full items-center justify-center p-4"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid SVG output is safe */}
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </div>
    </div>
  );
}
