"use client";

import { useQuery } from "@tanstack/react-query";
import { DocumentPreviewPanel } from "@/components/document-preview/document-preview-panel";
import { EmailPreviewPanel } from "@/components/email-preview/email-preview-panel";
import { FilePreviewPanel } from "@/components/file-preview/file-preview-panel";
import { AudioViewer } from "@/components/file-preview/viewers/audio/audio-viewer";
import { VideoViewer } from "@/components/file-preview/viewers/video/video-viewer";
import { Icons } from "@/components/icons";
import { SlackPreviewPanel } from "@/components/slack-preview/slack-preview-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { PreviewType } from "@/hooks/use-document-preview";
import type { MediaDocument } from "@/lib/search-types";
import { useTRPC } from "@/trpc/client";

type MediaPreviewContentProps = {
  media: MediaDocument;
  onClose: () => void;
};

function MediaPreviewContent({ media, onClose }: MediaPreviewContentProps) {
  const trpc = useTRPC();

  const { data, isLoading, isError } = useQuery({
    ...trpc.files.getPreviewUrl.queryOptions({ documentId: media.id }),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <article className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 overflow-hidden border-border/50 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="overflow-hidden text-ellipsis font-medium text-sm">
              {media.title}
            </h2>
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
        </header>
        <figure className="flex min-h-0 flex-1 items-center justify-center">
          <Skeleton className="aspect-video w-full max-w-lg" />
        </figure>
      </article>
    );
  }

  if (isError || !data) {
    return (
      <article className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 overflow-hidden border-border/50 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="overflow-hidden text-ellipsis font-medium text-sm">
              {media.title}
            </h2>
          </div>
          <Button
            className="shrink-0"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <Icons.Close size={16} />
          </Button>
        </header>
        <section className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-foreground/50 text-sm">Failed to load media</p>
        </section>
      </article>
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
    <article className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 overflow-hidden border-border/50 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="overflow-hidden text-ellipsis font-medium text-sm">
            {media.title}
          </h2>
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
      </header>
      <figure className="min-h-0 flex-1 overflow-hidden">
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
      </figure>
    </article>
  );
}

function renderPreviewContent(
  previewId: string,
  previewType: PreviewType,
  onClose: () => void,
  mediaData?: MediaDocument | null
) {
  switch (previewType) {
    case "email":
      return <EmailPreviewPanel documentId={previewId} onClose={onClose} />;
    case "slack":
      return <SlackPreviewPanel documentId={previewId} onClose={onClose} />;
    case "notion":
      return <DocumentPreviewPanel documentId={previewId} onClose={onClose} />;
    case "media":
      if (mediaData) {
        return <MediaPreviewContent media={mediaData} onClose={onClose} />;
      }
      return <FilePreviewPanel documentId={previewId} onClose={onClose} />;
    default:
      return <FilePreviewPanel documentId={previewId} onClose={onClose} />;
  }
}

type SearchPreviewSheetProps = {
  previewId: string | null;
  previewType?: PreviewType | null;
  onClose: () => void;
  mediaData?: MediaDocument | null;
};

export function SearchPreviewSheet({
  previewId,
  previewType,
  onClose,
  mediaData,
}: SearchPreviewSheetProps) {
  const isOpen = !!previewId;

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent className="w-[800px]" side="right" title="Document Preview">
        {previewId && previewType && (
          <div className="h-full overflow-hidden">
            {renderPreviewContent(previewId, previewType, onClose, mediaData)}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
