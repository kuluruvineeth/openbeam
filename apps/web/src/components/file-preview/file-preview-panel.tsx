"use client";

import { useQuery } from "@tanstack/react-query";
import { getFileCategory } from "@/lib/file-preview-config";
import { useTRPC } from "@/trpc/client";
import { FilePreviewError } from "./file-preview-error";
import { FilePreviewHeader } from "./file-preview-header";
import { FilePreviewLoading } from "./file-preview-loading";
import { FilePreviewUnsupported } from "./file-preview-unsupported";
import { FileViewerSelector } from "./file-viewer-selector";

const CHUNKS_PER_PAGE = 2;

type FilePreviewPanelProps = {
  documentId: string;
  onClose: () => void;
  highlightText?: string;
  chunkIndex?: number;
  pageNumber?: number;
};

export function FilePreviewPanel({
  documentId,
  onClose,
  highlightText,
  chunkIndex,
  pageNumber,
}: FilePreviewPanelProps) {
  const trpc = useTRPC();

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...trpc.files.getPreviewUrl.queryOptions({ documentId }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return <FilePreviewLoading />;
  }

  if (isError || !data) {
    return (
      <FilePreviewError
        error={error?.message}
        onClose={onClose}
        onRetry={() => refetch()}
      />
    );
  }

  const { url, fileName, mimeType } = data;
  const fileSize = data.fileSize ?? undefined;
  const pageCount = data.pageCount ?? undefined;
  const vespaId =
    "vespaId" in data && typeof data.vespaId === "string"
      ? data.vespaId
      : undefined;
  const twelveLabsAssetId =
    "twelveLabsAssetId" in data && typeof data.twelveLabsAssetId === "string"
      ? data.twelveLabsAssetId
      : undefined;
  const category = getFileCategory(mimeType);

  const initialPage =
    pageNumber ??
    (chunkIndex !== undefined && pageCount
      ? Math.min(Math.floor(chunkIndex / CHUNKS_PER_PAGE) + 1, pageCount)
      : undefined);

  if (category === "unsupported") {
    return (
      <FilePreviewUnsupported
        fileName={fileName}
        fileSize={fileSize}
        mimeType={mimeType}
        onClose={onClose}
        url={url}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <FilePreviewHeader
        fileName={fileName}
        fileSize={fileSize}
        mimeType={mimeType}
        onClose={onClose}
        pageCount={pageCount}
        url={url}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <FileViewerSelector
          category={category}
          fileName={fileName}
          fileSize={fileSize}
          highlightText={highlightText}
          initialPage={initialPage}
          mimeType={mimeType}
          onClose={onClose}
          twelveLabsAssetId={twelveLabsAssetId}
          url={url}
          vespaId={vespaId}
        />
      </div>
    </div>
  );
}
