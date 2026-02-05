"use client";

import { Button, TooltipProvider } from "@openplane/ui";
import { renderAsync } from "docx-preview";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import "@/styles/docx-viewer.css";
import { DocxSkeleton } from "../file-preview-loading";
import { DocxToolbar } from "./docx-toolbar";

type DocxViewerProps = {
  url: string;
  fileName: string;
};

type ViewerState = "loading" | "ready" | "error";

const HIDE_CONTROLS_DELAY = 3000;

export function DocxViewer({ url }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<HTMLElement[]>([]);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<ViewerState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showControls, setShowControls] = useState(true);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(
      () => setShowControls(false),
      HIDE_CONTROLS_DELAY
    );
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [resetHideTimer]);

  const loadDocument = useCallback(async () => {
    if (!containerRef.current) {
      return;
    }

    setState("loading");
    setErrorMessage(undefined);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }

      const blob = await response.blob();
      containerRef.current.innerHTML = "";

      await renderAsync(blob, containerRef.current, undefined, {
        className: "docx",
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      const pages = containerRef.current.querySelectorAll("section.docx");
      pageRefs.current = Array.from(pages) as HTMLElement[];
      setTotalPages(pages.length);
      setCurrentPage(1);

      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load document"
      );
    }
  }, [url]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleScroll = useCallback(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || pageRefs.current.length === 0) {
      return;
    }

    resetHideTimer();

    const containerRect = scrollContainer.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    let closestPage = 1;
    let closestDistance = Number.POSITIVE_INFINITY;

    pageRefs.current.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - containerCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = index + 1;
      }
    });

    setCurrentPage(closestPage);
  }, [resetHideTimer]);

  const goToPage = useCallback(
    (page: number) => {
      resetHideTimer();
      const element = pageRefs.current[page - 1];
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [resetHideTimer]
  );

  const handleDownload = useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <Icons.AlertCircle className="text-destructive/50" size={24} />
        <p className="text-foreground/50 text-sm">{errorMessage}</p>
        <div className="flex gap-2">
          <Button
            className="h-8 px-3 text-xs"
            onClick={loadDocument}
            variant="outline"
          >
            <Icons.RefreshCw className="mr-1.5" size={12} />
            Retry
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            onClick={handleDownload}
            variant="outline"
          >
            <Icons.ExternalLink className="mr-1.5" size={12} />
            Download
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative h-full">
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: passive tracking for toolbar auto-hide */}
        <section
          aria-label="Document content"
          className="docx-viewer-container"
          onMouseMove={resetHideTimer}
          onScroll={handleScroll}
          ref={scrollRef}
        >
          {state === "loading" && (
            <div className="absolute inset-0 z-10 bg-background">
              <DocxSkeleton />
            </div>
          )}
          <div className="docx-viewer-content" ref={containerRef} />
        </section>

        {state === "ready" && totalPages > 0 && (
          <DocxToolbar
            currentPage={currentPage}
            onDownload={handleDownload}
            onNextPage={() =>
              currentPage < totalPages && goToPage(currentPage + 1)
            }
            onPrevPage={() => currentPage > 1 && goToPage(currentPage - 1)}
            totalPages={totalPages}
            visible={showControls}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
