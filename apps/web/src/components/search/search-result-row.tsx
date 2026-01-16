"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@openplane/ui";
import { forwardRef } from "react";

import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import type { PreviewType } from "@/hooks/use-document-preview";
import { getPreviewCategory, isPreviewable } from "@/lib/file-preview-config";
import {
  formatFileSize,
  formatFullTime,
  formatRelativeTime,
  getContentPreview,
  getInitials,
} from "@/lib/format";
import {
  formatSourceName,
  getConnectorApp,
  getDocumentIcon,
  getDocumentTypeLabel,
  isContentPrimary,
} from "@/lib/search-display";
import type { SearchResultDocument } from "@/lib/search-types";
import { cn } from "@/lib/utils";

type SearchResultRowProps = {
  document: SearchResultDocument;
  isLast?: boolean;
  isSelected?: boolean;
  isPreviewing?: boolean;
  onSelect?: (doc: SearchResultDocument) => void;
  onPreview?: (doc: SearchResultDocument, previewType: PreviewType) => void;
};

function RowIcon({ doc }: { doc: SearchResultDocument }) {
  const app = getConnectorApp(doc.connector_type);
  const TypeIcon = getDocumentIcon(
    doc.connector_type,
    doc.document_type,
    doc.mime_type
  );

  return (
    <div className="flex size-7 shrink-0 items-center justify-center bg-foreground/3">
      {app ? <AppLogo app={app} size={16} /> : <TypeIcon size={14} />}
    </div>
  );
}

function RowHeader({ doc }: { doc: SearchResultDocument }) {
  const typeLabel = getDocumentTypeLabel(
    doc.connector_type,
    doc.document_type,
    doc.mime_type
  );

  return (
    <header className="flex items-center gap-2 font-mono text-[10px]">
      <span className="text-foreground/40 uppercase tracking-wide">
        {typeLabel}
      </span>
      {doc.source_name && (
        <>
          <span className="text-foreground/20">·</span>
          <span className="flex items-center gap-0.5 text-foreground/50">
            {doc.source_type === "channel" && (
              <Icons.Hash className="text-foreground/30" size={10} />
            )}
            {formatSourceName(
              doc.connector_type,
              doc.source_name,
              doc.source_type
            )}
          </span>
        </>
      )}
      <time
        className="ml-auto text-foreground/30 tabular-nums"
        dateTime={
          doc.created_at ? new Date(doc.created_at).toISOString() : undefined
        }
        title={formatFullTime(doc.created_at)}
      >
        {formatRelativeTime(doc.created_at)}
      </time>
    </header>
  );
}

function RowSubtitle({ doc }: { doc: SearchResultDocument }) {
  const updatedAt = doc.updated_at || doc.created_at;

  if (!updatedAt) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
      {doc.author_name && (
        <>
          <Avatar className="size-4">
            {doc.author_avatar_url && (
              <AvatarImage src={doc.author_avatar_url} />
            )}
            <AvatarFallback className="text-[8px]">
              {getInitials(doc.author_name)}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate">{doc.author_name}</span>
          <span className="text-foreground/30">·</span>
        </>
      )}
      <span title={formatFullTime(updatedAt)}>
        Updated {formatRelativeTime(updatedAt)}
      </span>
    </div>
  );
}

function RowMetadata({ doc }: { doc: SearchResultDocument }) {
  const reactions = doc.reaction_count ?? 0;
  const replies = doc.reply_count ?? 0;
  const attachments = doc.attachments?.length ?? 0;

  if (!(reactions || replies || attachments || doc.file_size)) {
    return null;
  }

  return (
    <footer className="flex items-center gap-3 font-mono text-[10px] text-foreground/40">
      {reactions > 0 && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icons.Heart size={10} />
          {reactions}
        </span>
      )}
      {replies > 0 && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icons.Comment size={10} />
          {replies}
        </span>
      )}
      {attachments > 0 && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icons.Attachment size={10} />
          {attachments}
        </span>
      )}
      {doc.file_size && (
        <span className="text-foreground/30 tabular-nums">
          {formatFileSize(doc.file_size)}
        </span>
      )}
    </footer>
  );
}

function ActionIndicator({
  previewCategory,
  canPreviewFile,
  hasUrl,
  mimeType,
}: {
  previewCategory: ReturnType<typeof getPreviewCategory>;
  canPreviewFile: boolean;
  hasUrl: boolean;
  mimeType?: string;
}) {
  if (previewCategory === "email") {
    return <Icons.Mail className="text-foreground/30" size={12} />;
  }
  if (previewCategory === "slack") {
    return <Icons.Messages className="text-foreground/30" size={12} />;
  }
  if (previewCategory === "notion") {
    return <Icons.FileIcon className="text-foreground/30" size={12} />;
  }
  if (canPreviewFile) {
    const isPdf = mimeType?.toLowerCase() === "application/pdf";
    const Icon = isPdf ? Icons.FilePdf : Icons.FileIcon;
    return <Icon className="text-foreground/30" size={12} />;
  }
  if (hasUrl) {
    return <Icons.ExternalLink className="text-foreground/30" size={12} />;
  }
  return null;
}

export const SearchResultRow = forwardRef<
  HTMLButtonElement,
  SearchResultRowProps
>(function SearchResultRowInner(
  { document: doc, isSelected, isPreviewing, onSelect, onPreview },
  ref
) {
  const showContentPrimary = isContentPrimary(
    doc.connector_type,
    doc.document_type
  );
  const displayTitle = showContentPrimary ? null : doc.file_name || doc.title;
  const contentPreview = getContentPreview(doc.content || "");
  const hasUrl = !!doc.url;
  const canPreviewFile = isPreviewable(
    doc.mime_type,
    doc.file_name,
    doc.document_type
  );
  const previewCategory = getPreviewCategory(
    doc.connector_type,
    doc.document_type
  );

  const handleClick = () => {
    onSelect?.(doc);
    if (previewCategory) {
      onPreview?.(doc, previewCategory);
    } else if (canPreviewFile) {
      onPreview?.(doc, "document");
    }
  };

  return (
    <button
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition-colors",
        isSelected && "bg-foreground/4",
        isPreviewing && "border-l-2 border-l-foreground/20 bg-foreground/6",
        "hover:bg-foreground/3",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/10 focus-visible:ring-inset"
      )}
      onClick={handleClick}
      ref={ref}
      type="button"
    >
      <RowIcon doc={doc} />

      <div className="min-w-0 flex-1 space-y-1">
        <RowHeader doc={doc} />
        {displayTitle && (
          <p className="line-clamp-1 text-[13px] text-foreground/90 leading-snug">
            {displayTitle}
          </p>
        )}
        <RowSubtitle doc={doc} />
        {contentPreview && (
          <p
            className={cn(
              "line-clamp-2 text-[12px] leading-relaxed",
              displayTitle ? "text-foreground/50" : "text-foreground/80"
            )}
          >
            {contentPreview}
          </p>
        )}
        <RowMetadata doc={doc} />
      </div>

      <div className="shrink-0 self-start pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <ActionIndicator
          canPreviewFile={canPreviewFile}
          hasUrl={hasUrl}
          mimeType={doc.mime_type}
          previewCategory={previewCategory}
        />
      </div>
    </button>
  );
});
