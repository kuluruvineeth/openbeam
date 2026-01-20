"use client";

import { Command as CommandPrimitive } from "cmdk";
import Image from "next/image";
import { forwardRef, useState } from "react";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { getContentPreview } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getConnectorApp, getDocumentTypeLabel } from "../lib/display";
import type {
  MediaDocument,
  SearchResultDocument,
  UnifiedSearchItem,
} from "../types";

type Props = {
  item: UnifiedSearchItem;
  onSelect: () => void;
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) {
    return "";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function MediaThumbnail({ media }: { media: MediaDocument }) {
  const [hasError, setHasError] = useState(false);
  const duration = formatDuration(media.duration_seconds);
  const showImage = media.thumbnail_url && !hasError;

  return (
    <div className="relative h-9 w-16 shrink-0 overflow-hidden bg-foreground/5">
      {showImage ? (
        <Image
          alt=""
          className="object-cover"
          fill
          onError={() => setHasError(true)}
          sizes="64px"
          src={media.thumbnail_url ?? ""}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icons.Video className="text-foreground/20" size={14} />
        </div>
      )}
      {duration && (
        <div className="absolute right-0.5 bottom-0.5 bg-black/80 px-0.5 font-mono text-[8px] text-white tabular-nums">
          {duration}
        </div>
      )}
    </div>
  );
}

function DocumentIcon({ doc }: { doc: SearchResultDocument }) {
  const app = getConnectorApp(doc.connector_type);

  return (
    <div className="flex size-7 shrink-0 items-center justify-center bg-foreground/3">
      {app ? <AppLogo app={app} size={14} /> : <Icons.FileIcon size={12} />}
    </div>
  );
}

function getDocumentPreview(doc: SearchResultDocument): string {
  const title = doc.title?.trim();
  const content = doc.content?.trim();
  const docType = doc.document_type?.toLowerCase();

  if (docType === "message" && content) {
    return getContentPreview(content, 60);
  }

  const lowerTitle = title?.toLowerCase() ?? "";
  const isGenericTitle =
    lowerTitle.startsWith("message in") ||
    lowerTitle.startsWith("email from") ||
    lowerTitle.startsWith("file in");

  if (title && content && isGenericTitle) {
    return getContentPreview(content, 60);
  }

  if (title && title !== doc.source_name) {
    return title;
  }

  return content ? getContentPreview(content, 60) : title || "Untitled";
}

function getSubtitle(item: UnifiedSearchItem): string | null {
  if (item.type === "media") {
    return null;
  }
  const doc = item.data as SearchResultDocument;
  return getContentPreview(doc.content || "", 40);
}

export const SearchCommandItem = forwardRef<HTMLDivElement, Props>(
  ({ item, onSelect }, ref) => {
    const isMedia = item.type === "media";
    const doc = item.data as SearchResultDocument;
    const media = item.data as MediaDocument;

    const displayText = isMedia
      ? media.title || "Untitled Media"
      : getDocumentPreview(doc);

    const subtitle = getSubtitle(item);
    const showSubtitle = subtitle && subtitle !== displayText;

    const typeLabel = isMedia
      ? "Media"
      : getDocumentTypeLabel(doc.connector_type ?? "", doc.document_type);

    return (
      <CommandPrimitive.Item
        className={cn(
          "relative flex w-full cursor-default select-none items-center gap-3 px-3 py-2.5 outline-none",
          "border-border/40 border-b last:border-b-0",
          "data-[selected=true]:bg-foreground/5"
        )}
        onSelect={onSelect}
        ref={ref}
        value={item.data.id}
      >
        {isMedia ? (
          <MediaThumbnail media={media} />
        ) : (
          <DocumentIcon doc={doc} />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-foreground/90">
            {displayText}
          </p>
          {showSubtitle && (
            <p className="truncate font-mono text-[10px] text-foreground/40">
              {subtitle}
            </p>
          )}
        </div>

        <span className="shrink-0 font-mono text-[9px] text-foreground/40 uppercase">
          {typeLabel}
        </span>
      </CommandPrimitive.Item>
    );
  }
);

SearchCommandItem.displayName = "SearchCommandItem";
