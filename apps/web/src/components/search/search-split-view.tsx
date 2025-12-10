"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { FilePreviewPanel } from "@/components/file-preview";
import { VideoViewer } from "@/components/file-preview/viewers/video";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import type { VideoDocument } from "@/lib/search-types";
import { useTRPC } from "@/trpc/client";

type PreviewType = "document" | "video";

type SearchSplitViewProps = {
  children: ReactNode;
  previewId: string | null;
  previewType?: PreviewType;
  onClosePreview: () => void;
  highlightText?: string;
  chunkIndex?: number;
  pageNumber?: number;
  videoData?: VideoDocument | null;
};

function VideoPreviewPanel({
  video,
  onClose,
}: {
  video: VideoDocument;
  onClose: () => void;
}) {
  const trpc = useTRPC();

  const { data, isLoading, isError } = useQuery({
    ...trpc.files.getPreviewUrl.queryOptions({ documentId: video.id }),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-border/50 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 font-medium text-sm">{video.title}</h3>
            {video.source_name && (
              <p className="font-mono text-[10px] text-foreground/50">
                {video.source_name}
              </p>
            )}
          </div>
          <Button
            className="ml-2 shrink-0"
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
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-border/50 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 font-medium text-sm">{video.title}</h3>
          </div>
          <Button
            className="ml-2 shrink-0"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <Icons.Close size={16} />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-foreground/50 text-sm">Failed to load video</p>
        </div>
      </div>
    );
  }

  const videoId =
    "videoId" in data && typeof data.videoId === "string"
      ? data.videoId
      : video.id;
  const vespaId =
    "vespaId" in data && typeof data.vespaId === "string"
      ? data.vespaId
      : video.id;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-border/50 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-medium text-sm">{video.title}</h3>
          {video.source_name && (
            <p className="font-mono text-[10px] text-foreground/50">
              {video.source_name}
            </p>
          )}
        </div>
        <Button
          className="ml-2 shrink-0"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <Icons.Close size={16} />
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <VideoViewer
          fileName={video.title}
          url={data.url}
          vespaId={vespaId}
          videoId={videoId}
        />
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
  videoData,
}: SearchSplitViewProps) {
  const hasPreview = !!previewId;
  const isVideoPreview = previewType === "video" && videoData;

  return (
    <ResizablePanelGroup className="h-full" direction="horizontal">
      <ResizablePanel defaultSize={hasPreview ? 50 : 100} minSize={30}>
        {children}
      </ResizablePanel>

      {hasPreview && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full border-border/50 border-l">
              {isVideoPreview ? (
                <VideoPreviewPanel onClose={onClosePreview} video={videoData} />
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
