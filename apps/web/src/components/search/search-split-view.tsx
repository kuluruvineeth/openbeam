"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { FilePreviewPanel } from "@/components/file-preview";
import { AudioViewer } from "@/components/file-preview/viewers/audio";
import { VideoViewer } from "@/components/file-preview/viewers/video";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaDocument } from "@/lib/search-types";
import { useTRPC } from "@/trpc/client";

type PreviewType = "document" | "media";

type SearchSplitViewProps = {
  children: ReactNode;
  previewId: string | null;
  previewType?: PreviewType;
  onClosePreview: () => void;
  highlightText?: string;
  chunkIndex?: number;
  pageNumber?: number;
  mediaData?: MediaDocument | null;
};

function MediaPreviewPanel({
  media,
  onClose,
}: {
  media: MediaDocument;
  onClose: () => void;
}) {
  const trpc = useTRPC();

  const { data, isLoading, isError } = useQuery({
    ...trpc.files.getPreviewUrl.queryOptions({ documentId: media.id }),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 overflow-hidden border-border/50 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="overflow-hidden text-ellipsis font-medium text-sm">
              {media.title}
            </h3>
            {media.source_name && (
              <p className="overflow-hidden text-ellipsis font-mono text-[10px] text-foreground/50">
                {media.source_name}
              </p>
            )}
          </div>
          <Button
            className="shrink-0"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <Icons.Close size={16} />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Skeleton className="aspect-video w-full max-w-lg" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 overflow-hidden border-border/50 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="overflow-hidden text-ellipsis font-medium text-sm">
              {media.title}
            </h3>
          </div>
          <Button
            className="shrink-0"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <Icons.Close size={16} />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-foreground/50 text-sm">Failed to load media</p>
        </div>
      </div>
    );
  }

  const mediaId =
    "twelveLabsAssetId" in data && typeof data.twelveLabsAssetId === "string"
      ? data.twelveLabsAssetId
      : media.id;
  const vespaId =
    "vespaId" in data && typeof data.vespaId === "string"
      ? data.vespaId
      : media.id;
  const mimeType =
    "mimeType" in data && typeof data.mimeType === "string"
      ? data.mimeType
      : "";
  const isAudio = mimeType.startsWith("audio/");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 overflow-hidden border-border/50 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="overflow-hidden text-ellipsis font-medium text-sm">
            {media.title}
          </h3>
          {media.source_name && (
            <p className="overflow-hidden text-ellipsis font-mono text-[10px] text-foreground/50">
              {media.source_name}
            </p>
          )}
        </div>
        <Button
          className="shrink-0"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <Icons.Close size={16} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {isAudio ? (
          <AudioViewer
            twelveLabsAssetId={mediaId}
            url={data.url}
            vespaId={vespaId}
          />
        ) : (
          <VideoViewer
            twelveLabsAssetId={mediaId}
            url={data.url}
            vespaId={vespaId}
          />
        )}
      </div>
    </div>
  );
}

export function SearchSplitView({
  children,
  previewId,
  previewType = "document",
  onClosePreview,
  highlightText,
  chunkIndex,
  pageNumber,
  mediaData,
}: SearchSplitViewProps) {
  const hasPreview = !!previewId;
  const isMediaPreview = previewType === "media" && mediaData;

  return (
    <ResizablePanelGroup className="h-full" direction="horizontal">
      <ResizablePanel defaultSize={hasPreview ? 50 : 100} minSize={30}>
        {children}
      </ResizablePanel>

      {hasPreview && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full overflow-hidden border-border/50 border-l">
              {isMediaPreview ? (
                <MediaPreviewPanel media={mediaData} onClose={onClosePreview} />
              ) : (
                <FilePreviewPanel
                  chunkIndex={chunkIndex}
                  documentId={previewId}
                  highlightText={highlightText}
                  onClose={onClosePreview}
                  pageNumber={pageNumber}
                />
              )}
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
