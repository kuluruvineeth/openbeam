"use client";

import { Button, Skeleton } from "@openplane/ui";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type ImageViewerProps = {
  url: string;
  fileName: string;
};

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3] as const;

export function ImageViewer({ url, fileName }: ImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(3); // Default to 100%
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const isZoomed = zoom > 1;

  const zoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (ZOOM_LEVELS[next] <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoomIndex(3);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) {
        return;
      }
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [isZoomed, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!(isDragging && isZoomed)) {
        return;
      }
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    },
    [isDragging, isZoomed]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    },
    [zoomIn, zoomOut]
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Icons.FileImageIcon className="text-foreground/30" size={32} />
          <p className="text-foreground/50 text-sm">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-center gap-1 border-border/30 border-b bg-foreground/[0.02] px-3">
        <Button
          className="size-7"
          disabled={zoomIndex <= 0}
          onClick={zoomOut}
          size="icon"
          variant="ghost"
        >
          <span className="text-foreground/50 text-xs">−</span>
        </Button>
        <button
          className="min-w-[50px] text-center font-mono text-[11px] text-foreground/60 tabular-nums hover:text-foreground/80"
          onClick={resetZoom}
          type="button"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          className="size-7"
          disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
          onClick={zoomIn}
          size="icon"
          variant="ghost"
        >
          <span className="text-foreground/50 text-xs">+</span>
        </Button>
      </div>

      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: pan/zoom controls require mouse interactions */}
      <div
        aria-label="Image viewer - use mouse to pan and zoom"
        className={cn(
          "relative flex-1 overflow-hidden",
          isZoomed ? "cursor-grab" : "cursor-default",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        ref={containerRef}
        role="application"
      >
        <div
          className={cn(
            "relative flex h-full w-full items-center justify-center p-4",
            isLoading && "animate-pulse"
          )}
          style={{
            transform: isZoomed
              ? `translate(${position.x}px, ${position.y}px)`
              : "none",
          }}
        >
          <Image
            alt={fileName}
            className={cn(
              "object-contain transition-opacity duration-200",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            draggable={false}
            fill
            onError={() => {
              setError(true);
              setIsLoading(false);
            }}
            onLoad={() => setIsLoading(false)}
            sizes="100vw"
            src={url}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            unoptimized
          />
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <Skeleton className="aspect-video h-auto w-full max-w-md" />
          </div>
        )}
      </div>
    </div>
  );
}
