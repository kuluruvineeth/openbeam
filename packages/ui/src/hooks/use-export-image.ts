"use client";

import {
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from "@xyflow/react";
import { toBlob, toPng, toSvg } from "html-to-image";
import { useCallback } from "react";

const DEFAULT_WIDTH = 2048;
const DEFAULT_HEIGHT = 1536;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const VIEWPORT_PADDING = 0.1;
const VIEWPORT_SELECTOR = ".react-flow__viewport";

interface ExportImageOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

function getViewportElement(): HTMLElement | null {
  return document.querySelector(VIEWPORT_SELECTOR);
}

function buildExportStyle(
  viewport: { x: number; y: number; zoom: number },
  width: number,
  height: number
): Partial<CSSStyleDeclaration> {
  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
  };
}

export interface UseExportImageReturn {
  exportPng: (options?: ExportImageOptions) => Promise<void>;
  exportSvg: (options?: ExportImageOptions) => Promise<void>;
  copyToClipboard: () => Promise<boolean>;
}

export function useExportImage(): UseExportImageReturn {
  const { getNodes } = useReactFlow();

  const exportPng = useCallback(
    async (options?: ExportImageOptions) => {
      const width = options?.width ?? DEFAULT_WIDTH;
      const height = options?.height ?? DEFAULT_HEIGHT;
      const bg = options?.backgroundColor ?? "hsl(var(--background))";
      const nodesBounds = getNodesBounds(getNodes());
      const viewport = getViewportForBounds(
        nodesBounds,
        width,
        height,
        MIN_ZOOM,
        MAX_ZOOM,
        VIEWPORT_PADDING
      );

      const el = getViewportElement();
      if (!el) {
        return;
      }

      const dataUrl = await toPng(el, {
        backgroundColor: bg,
        width,
        height,
        style: buildExportStyle(viewport, width, height),
      });

      const link = document.createElement("a");
      link.download = "canvas.png";
      link.href = dataUrl;
      link.click();
    },
    [getNodes]
  );

  const exportSvg = useCallback(
    async (options?: ExportImageOptions) => {
      const width = options?.width ?? DEFAULT_WIDTH;
      const height = options?.height ?? DEFAULT_HEIGHT;
      const bg = options?.backgroundColor ?? "hsl(var(--background))";
      const nodesBounds = getNodesBounds(getNodes());
      const viewport = getViewportForBounds(
        nodesBounds,
        width,
        height,
        MIN_ZOOM,
        MAX_ZOOM,
        VIEWPORT_PADDING
      );

      const el = getViewportElement();
      if (!el) {
        return;
      }

      const dataUrl = await toSvg(el, {
        backgroundColor: bg,
        width,
        height,
        style: buildExportStyle(viewport, width, height),
      });

      const link = document.createElement("a");
      link.download = "canvas.svg";
      link.href = dataUrl;
      link.click();
    },
    [getNodes]
  );

  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    const el = getViewportElement();
    if (!el) {
      return false;
    }

    const width = DEFAULT_WIDTH;
    const height = DEFAULT_HEIGHT;
    const nodesBounds = getNodesBounds(getNodes());
    const viewport = getViewportForBounds(
      nodesBounds,
      width,
      height,
      MIN_ZOOM,
      MAX_ZOOM,
      VIEWPORT_PADDING
    );

    const blob = await toBlob(el, {
      backgroundColor: "hsl(var(--background))",
      width,
      height,
      style: buildExportStyle(viewport, width, height),
    });

    if (!blob) {
      return false;
    }

    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  }, [getNodes]);

  return { exportPng, exportSvg, copyToClipboard };
}
