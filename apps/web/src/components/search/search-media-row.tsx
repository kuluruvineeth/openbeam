"use client";

import Image from "next/image";
import { forwardRef, useState } from "react";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import {
  formatDuration,
  formatFullTime,
  formatRelativeTime,
} from "@/lib/format";
import { MEDIA_TYPE_CONFIG } from "@/lib/search-config";
import { formatSourceName, getConnectorApp } from "@/lib/search-display";
import type { MediaDocument, MediaType } from "@/lib/search-types";
import { cn } from "@/lib/utils";

type SearchMediaRowProps = {
  media: MediaDocument;
  isLast?: boolean;
  isSelected?: boolean;
  isPreviewing?: boolean;
  onSelect?: (media: MediaDocument) => void;
  onPreview?: (media: MediaDocument) => void;
};

function ThumbnailPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Icons.Video className="text-foreground/20" size={24} />
    </div>
  );
}

function MediaThumbnail({
  thumbnailUrl,
  duration,
}: {
  thumbnailUrl?: string;
  duration: number;
}) {
  const [hasError, setHasError] = useState(false);
  const showImage = thumbnailUrl && !hasError;

  return (
    <div className="relative h-16 w-28 shrink-0 overflow-hidden bg-foreground/5">
      {showImage ? (
        <Image
          alt=""
          className="object-cover"
          fill
          onError={() => setHasError(true)}
          sizes="112px"
          src={thumbnailUrl}
        />
      ) : (
        <ThumbnailPlaceholder />
      )}
      <div className="absolute right-1 bottom-1 bg-black/80 px-1 py-0.5 font-mono text-[10px] text-white tabular-nums">
        {formatDuration(duration)}
      </div>
    </div>
  );
}

function MediaTypeBadge({ type }: { type?: MediaType }) {
  const config = MEDIA_TYPE_CONFIG[type || "other"];
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide",
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

function MediaHeader({ media }: { media: MediaDocument }) {
  const connectorType = media.connector_type || media.source_type;
  const app = connectorType ? getConnectorApp(connectorType) : null;

  return (
    <div className="flex items-center gap-2 font-mono text-[10px]">
      {app && (
        <>
          <AppLogo app={app} size={12} />
          <span className="text-foreground/20">·</span>
        </>
      )}
      <MediaTypeBadge type={media.media_type} />
      {media.source_name && (
        <>
          <span className="text-foreground/20">·</span>
          <span className="flex items-center gap-0.5 text-foreground/50">
            {formatSourceName(
              connectorType || "",
              media.source_name,
              media.source_type
            )}
          </span>
        </>
      )}
      <span
        className="ml-auto text-foreground/30 tabular-nums"
        title={formatFullTime(media.created_at)}
      >
        {formatRelativeTime(media.created_at)}
      </span>
    </div>
  );
}

function MediaMetadataInfo({ media }: { media: MediaDocument }) {
  const viewCount = media.view_count ?? 0;
  const participantCount = media.participants?.length ?? 0;

  if (!(media.author_name || viewCount || participantCount)) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 font-mono text-[10px] text-foreground/40">
      {media.author_name && (
        <span className="max-w-[100px] truncate">{media.author_name}</span>
      )}
      {participantCount > 0 && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icons.User size={10} />
          {participantCount}
        </span>
      )}
      {viewCount > 0 && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icons.Eye size={10} />
          {viewCount.toLocaleString()}
        </span>
      )}
    </div>
  );
}

function getSummaryPreview(media: MediaDocument): string | undefined {
  if (media.media_summary) {
    return media.media_summary.length > 120
      ? `${media.media_summary.slice(0, 120)}...`
      : media.media_summary;
  }
  return media.description;
}

export const SearchMediaRow = forwardRef<
  HTMLButtonElement,
  SearchMediaRowProps
>(function SearchMediaRowInner(
  { media, isLast, isSelected, isPreviewing, onSelect, onPreview },
  ref
) {
  const summaryPreview = getSummaryPreview(media);

  const handleClick = () => {
    onSelect?.(media);
    onPreview?.(media);
  };

  return (
    <button
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition-colors",
        !isLast && "border-border/40 border-b",
        isSelected && "bg-foreground/4",
        isPreviewing && "border-l-2 border-l-foreground/20 bg-foreground/6",
        "hover:bg-foreground/3",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/10 focus-visible:ring-inset"
      )}
      onClick={handleClick}
      ref={ref}
      type="button"
    >
      <MediaThumbnail
        duration={media.duration_seconds}
        thumbnailUrl={media.thumbnail_url}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <MediaHeader media={media} />
        <p className="line-clamp-1 text-[13px] text-foreground/90 leading-snug">
          {media.title}
        </p>
        {summaryPreview && (
          <p className="line-clamp-2 text-[12px] text-foreground/50 leading-relaxed">
            {summaryPreview}
          </p>
        )}
        <MediaMetadataInfo media={media} />
      </div>

      <div className="shrink-0 self-start pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Icons.Play className="text-foreground/30" size={12} />
      </div>
    </button>
  );
});
