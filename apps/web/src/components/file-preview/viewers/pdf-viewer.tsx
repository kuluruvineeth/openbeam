"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Button, TooltipProvider } from "@openplane/ui";
import { PdfPagesSkeleton } from "@/components/file-preview/file-preview-loading";
import { PdfToolbar } from "@/components/file-preview/viewers/pdf-toolbar";
import { Icons } from "@/components/icons";
import {
  clearHighlights,
  highlightTextInPage,
  ZOOM_LEVELS,
} from "@/lib/pdf-utils";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfViewerProps = {
  url: string;
  fileName: string;
  initialPage?: number;
  highlightText?: string;
};

const HIDE_CONTROLS_DELAY = 3000;

export function PdfViewer({ url, initialPage, highlightText }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [highlightedElement, setHighlightedElement] =
    useState<HTMLElement | null>(null);
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - 32);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!(initialPage && numPages && initialPage <= numPages)) {
      return;
    }

    const timer = setTimeout(() => {
      pageRefs.current
        .get(initialPage)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);

    return () => clearTimeout(timer);
  }, [initialPage, numPages]);

  useEffect(() => {
    if (!(highlightText && initialPage && renderedPages.has(initialPage))) {
      return;
    }

    const pageElement = pageRefs.current.get(initialPage);
    if (!pageElement) {
      return;
    }

    if (highlightedElement) {
      const container = highlightedElement.closest(".react-pdf__Page");
      if (container) {
        clearHighlights(container as HTMLElement);
      }
    }

    const timer = setTimeout(() => {
      const highlighted = highlightTextInPage(pageElement, highlightText);
      if (highlighted) {
        setHighlightedElement(highlighted);
        highlighted.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [highlightText, initialPage, renderedPages, highlightedElement]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!(container && numPages)) {
      return;
    }

    resetHideTimer();

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    let closestPage = 1;
    let closestDistance = Number.POSITIVE_INFINITY;

    pageRefs.current.forEach((element, pageNum) => {
      const rect = element.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - containerCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = pageNum;
      }
    });

    setCurrentPage(closestPage);
  }, [numPages, resetHideTimer]);

  const goToPage = useCallback(
    (page: number) => {
      resetHideTimer();
      pageRefs.current
        .get(page)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [resetHideTimer]
  );

  const zoomIn = useCallback(() => {
    resetHideTimer();
    const idx = ZOOM_LEVELS.findIndex((z) => z >= scale);
    setScale(ZOOM_LEVELS[Math.min(idx + 1, ZOOM_LEVELS.length - 1)] ?? scale);
  }, [scale, resetHideTimer]);

  const zoomOut = useCallback(() => {
    resetHideTimer();
    const idx = ZOOM_LEVELS.findIndex((z) => z >= scale);
    setScale(ZOOM_LEVELS[Math.max(idx - 1, 0)] ?? scale);
  }, [scale, resetHideTimer]);

  const zoomReset = useCallback(() => {
    resetHideTimer();
    setScale(1.0);
  }, [resetHideTimer]);

  if (error) {
    return <PdfErrorState message={error.message} url={url} />;
  }

  const pageWidth = containerWidth > 0 ? containerWidth * scale : undefined;
  const maxZoom = ZOOM_LEVELS.at(-1) ?? 2.5;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex h-full flex-col">
        <PdfToolbar
          canZoomIn={scale < maxZoom}
          canZoomOut={scale > ZOOM_LEVELS[0]}
          currentPage={currentPage}
          hasHighlight={Boolean(highlightText && highlightedElement)}
          numPages={numPages}
          onNextPage={() =>
            numPages && currentPage < numPages && goToPage(currentPage + 1)
          }
          onPageChange={goToPage}
          onPrevPage={() => currentPage > 1 && goToPage(currentPage - 1)}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
          scale={scale}
          visible={showControls}
        />

        {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/noNoninteractiveElementInteractions: Scroll container mouse tracking for auto-hide toolbar */}
        <div
          className="flex-1 overflow-auto"
          onMouseMove={resetHideTimer}
          onScroll={handleScroll}
          ref={containerRef}
        >
          <Document
            className="flex flex-col items-center gap-4 p-4 pt-8 pb-24"
            file={url}
            loading={<PdfPagesSkeleton count={2} showLines={false} />}
            onLoadError={(err) => setError(err)}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          >
            {numPages &&
              Array.from({ length: numPages }, (_, i) => (
                <PdfPage
                  key={i + 1}
                  onRender={() =>
                    setRenderedPages((prev) => new Set(prev).add(i + 1))
                  }
                  pageNum={i + 1}
                  ref={(el) => {
                    if (el) {
                      pageRefs.current.set(i + 1, el);
                    }
                  }}
                  width={pageWidth}
                />
              ))}
          </Document>
        </div>
      </div>
    </TooltipProvider>
  );
}

function PdfErrorState({ url, message }: { url: string; message?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <Icons.AlertCircle className="text-destructive/50" size={24} />
      <p className="text-foreground/50 text-sm">
        {message || "Failed to load PDF"}
      </p>
      <Button
        className="h-8 px-3 text-xs"
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        variant="outline"
      >
        <Icons.ExternalLink className="mr-1.5" size={12} />
        Open in new tab
      </Button>
    </div>
  );
}

type PdfPageProps = {
  pageNum: number;
  width: number | undefined;
  onRender: () => void;
};

const PdfPage = forwardRef<HTMLDivElement, PdfPageProps>(
  ({ pageNum, width, onRender }, ref) => (
    <div className="relative" ref={ref}>
      <div className="-top-3 -translate-x-1/2 absolute left-1/2 rounded-full bg-muted/80 px-2 py-0.5 text-muted-foreground text-xs backdrop-blur-sm">
        {pageNum}
      </div>
      <Page
        className="overflow-hidden rounded-sm shadow-sm ring-1 ring-black/5 dark:ring-white/5"
        loading={
          <div
            className="shimmer flex items-center justify-center rounded-sm"
            style={{ width: width ?? 450, height: (width ?? 450) * 1.4 }}
          />
        }
        onRenderSuccess={onRender}
        pageNumber={pageNum}
        width={width}
      />
    </div>
  )
);

PdfPage.displayName = "PdfPage";
