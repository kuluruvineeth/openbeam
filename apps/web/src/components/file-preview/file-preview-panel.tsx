"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { getFileCategory } from "@/lib/file-preview-config";
import { useTRPC } from "@/trpc/client";
import { FilePreviewError } from "./file-preview-error";
import { FilePreviewHeader } from "./file-preview-header";
import {
  DocxSkeleton,
  FilePreviewLoading,
  ImageSkeleton,
  PdfPagesSkeleton,
  PresentationSkeleton,
  SpreadsheetSkeleton,
  TextSkeleton,
  VideoSkeleton,
} from "./file-preview-loading";
import { FilePreviewUnsupported } from "./file-preview-unsupported";

const PdfViewer = dynamic(
  () => import("./viewers/pdf-viewer").then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => <PdfPagesSkeleton count={2} showLines={false} />,
  }
);

const ImageViewer = dynamic(
  () => import("./viewers/image-viewer").then((mod) => mod.ImageViewer),
  { ssr: false, loading: () => <ImageSkeleton /> }
);

const TextViewer = dynamic(
  () => import("./viewers/text-viewer").then((mod) => mod.TextViewer),
  { ssr: false, loading: () => <TextSkeleton /> }
);

const DocxViewer = dynamic(
  () => import("./viewers/docx-viewer").then((mod) => mod.DocxViewer),
  { ssr: false, loading: () => <DocxSkeleton /> }
);

const SpreadsheetViewer = dynamic(
  () =>
    import("./viewers/spreadsheet-viewer").then((mod) => mod.SpreadsheetViewer),
  { ssr: false, loading: () => <SpreadsheetSkeleton /> }
);

const PresentationViewer = dynamic(
  () =>
    import("./viewers/presentation-viewer").then(
      (mod) => mod.PresentationViewer
    ),
  { ssr: false, loading: () => <PresentationSkeleton /> }
);

const VideoViewer = dynamic(
  () => import("./viewers/video/video-viewer").then((mod) => mod.VideoViewer),
  { ssr: false, loading: () => <VideoSkeleton /> }
);

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
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  const { url, fileName, mimeType, fileSize, pageCount } = data;
  const videoId =
    "videoId" in data && typeof data.videoId === "string"
      ? data.videoId
      : undefined;
  const vespaId =
    "vespaId" in data && typeof data.vespaId === "string"
      ? data.vespaId
      : undefined;
  const category = getFileCategory(mimeType);

  const initialPage =
    pageNumber ??
    (chunkIndex !== undefined && pageCount
      ? Math.min(Math.floor(chunkIndex / 2) + 1, pageCount)
      : undefined);

  const renderViewer = () => {
    switch (category) {
      case "pdf":
        return (
          <PdfViewer
            fileName={fileName}
            highlightText={highlightText}
            initialPage={initialPage}
            url={url}
          />
        );
      case "image":
        return <ImageViewer fileName={fileName} url={url} />;
      case "text":
      case "code":
        return <TextViewer fileName={fileName} mimeType={mimeType} url={url} />;
      case "docx":
        return <DocxViewer fileName={fileName} url={url} />;
      case "spreadsheet":
        return <SpreadsheetViewer fileName={fileName} url={url} />;
      case "presentation":
        return (
          <PresentationViewer
            fileName={fileName}
            fileSize={fileSize}
            url={url}
          />
        );
      case "video":
        if (!(videoId && vespaId)) {
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
          <VideoViewer
            fileName={fileName}
            url={url}
            vespaId={vespaId}
            videoId={videoId}
          />
        );
      default:
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
  };

  if (category === "unsupported" || category === "audio") {
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
    <div className="flex h-full flex-col bg-background">
      <FilePreviewHeader
        fileName={fileName}
        fileSize={fileSize}
        mimeType={mimeType}
        onClose={onClose}
        pageCount={pageCount}
        url={url}
      />
      <div className="min-h-0 flex-1">{renderViewer()}</div>
    </div>
  );
}
