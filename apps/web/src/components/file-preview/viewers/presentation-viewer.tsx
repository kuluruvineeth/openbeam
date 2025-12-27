"use client";

import JSZip from "jszip";
import { useCallback, useEffect, useRef, useState } from "react";
import { PresentationSkeleton } from "@/components/file-preview/file-preview-loading";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/format";

type PresentationViewerProps = {
  url: string;
  fileName: string;
  fileSize?: number;
};

type PresentationData = {
  thumbnailUrl: string | null;
  slideCount: number;
};

type ViewerState = "loading" | "ready" | "error";

const SLIDE_FILE_PATTERN = /ppt\/slides\/slide\d+\.xml/;

async function extractPptxData(blob: Blob): Promise<PresentationData> {
  const zip = await JSZip.loadAsync(blob);

  const thumbnailFile =
    zip.file("docProps/thumbnail.jpeg") || zip.file("docProps/thumbnail.png");

  const thumbnailUrl = thumbnailFile
    ? URL.createObjectURL(await thumbnailFile.async("blob"))
    : null;

  const slideFiles = Object.keys(zip.files).filter((name) =>
    SLIDE_FILE_PATTERN.test(name)
  );

  return { thumbnailUrl, slideCount: slideFiles.length };
}

export function PresentationViewer({
  url,
  fileName,
  fileSize,
}: PresentationViewerProps) {
  const [state, setState] = useState<ViewerState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [data, setData] = useState<PresentationData | null>(null);
  const thumbnailUrlRef = useRef<string | null>(null);

  const loadPresentation = useCallback(async () => {
    setState("loading");
    setErrorMessage(undefined);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const blob = await response.blob();
      const extracted = await extractPptxData(blob);
      thumbnailUrlRef.current = extracted.thumbnailUrl;
      setData(extracted);
      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load presentation"
      );
    }
  }, [url]);

  useEffect(() => {
    loadPresentation();

    return () => {
      if (thumbnailUrlRef.current) {
        URL.revokeObjectURL(thumbnailUrlRef.current);
      }
    };
  }, [loadPresentation]);

  const handleDownload = useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  if (state === "loading") {
    return <PresentationSkeleton />;
  }

  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <Icons.AlertCircle className="text-destructive/50" size={24} />
        <p className="text-foreground/50 text-sm">{errorMessage}</p>
        <div className="flex gap-2">
          <Button
            className="h-8 px-3 text-xs"
            onClick={loadPresentation}
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
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        {data?.thumbnailUrl ? (
          <div className="overflow-hidden rounded-md border border-border/50 shadow-sm">
            {/* biome-ignore lint/correctness/useImageSize: Dynamic thumbnail from PPTX */}
            {/* biome-ignore lint/performance/noImgElement: Native img for blob URL */}
            <img
              alt={`${fileName} thumbnail`}
              className="aspect-video w-80 bg-muted/30 object-contain"
              src={data.thumbnailUrl}
            />
          </div>
        ) : (
          <div className="flex aspect-video w-80 items-center justify-center rounded-md border border-border/50 bg-muted/30">
            <Icons.PresentationIcon className="text-foreground/30" size={48} />
          </div>
        )}

        <div className="space-y-1">
          <p className="font-medium text-foreground/90 text-sm">{fileName}</p>
          <p className="text-foreground/50 text-xs">
            {data?.slideCount ? `${data.slideCount} slides` : ""}
            {data?.slideCount && fileSize ? " · " : ""}
            {fileSize ? formatFileSize(fileSize) : ""}
          </p>
        </div>

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
