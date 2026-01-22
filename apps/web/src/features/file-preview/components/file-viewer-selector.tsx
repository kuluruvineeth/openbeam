"use client";

import dynamic from "next/dynamic";
import type { FileCategory } from "../lib/file-preview-config";
import {
  AudioSkeleton,
  DocxSkeleton,
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

const AudioViewer = dynamic(
  () => import("./viewers/audio/audio-viewer").then((mod) => mod.AudioViewer),
  { ssr: false, loading: () => <AudioSkeleton /> }
);

const IframeViewer = dynamic(
  () => import("./viewers/iframe-viewer").then((mod) => mod.IframeViewer),
  { ssr: false }
);

type FileViewerSelectorProps = {
  category: FileCategory;
  fileName: string;
  fileSize?: number;
  highlightText?: string;
  initialPage?: number;
  mimeType: string;
  onClose: () => void;
  twelveLabsAssetId?: string;
  url: string;
  vespaId?: string;
};

export function FileViewerSelector({
  category,
  fileName,
  fileSize,
  highlightText,
  initialPage,
  mimeType,
  onClose,
  twelveLabsAssetId,
  url,
  vespaId,
}: FileViewerSelectorProps) {
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
        <PresentationViewer fileName={fileName} fileSize={fileSize} url={url} />
      );
    case "video":
      if (!(vespaId && twelveLabsAssetId)) {
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
          twelveLabsAssetId={twelveLabsAssetId}
          url={url}
          vespaId={vespaId}
        />
      );
    case "audio":
      if (!(vespaId && twelveLabsAssetId)) {
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
        <AudioViewer
          twelveLabsAssetId={twelveLabsAssetId}
          url={url}
          vespaId={vespaId}
        />
      );
    case "embed":
      return <IframeViewer fileName={fileName} mimeType={mimeType} url={url} />;
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
}
