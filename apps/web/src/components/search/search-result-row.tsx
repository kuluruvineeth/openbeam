"use client";

import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import type { SearchResultDocument } from "@/hooks/use-search";
import {
  formatFileSize,
  formatFullTime,
  formatRelativeTime,
  getContentPreview,
} from "@/lib/format";
import {
  formatSourceName,
  getConnectorApp,
  getDocumentIcon,
  getDocumentTypeLabel,
  isContentPrimary,
} from "@/lib/search-display";
import { cn } from "@/lib/utils";

type SearchResultRowProps = {
  document: SearchResultDocument;
  isLast?: boolean;
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
    <div className="flex items-center gap-2 font-mono text-[10px]">
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

      <span
        className="ml-auto text-foreground/30 tabular-nums"
        title={formatFullTime(doc.created_at)}
      >
        {formatRelativeTime(doc.created_at)}
      </span>
    </div>
  );
}

function RowMetadata({ doc }: { doc: SearchResultDocument }) {
  const hasReactions = (doc.reaction_count ?? 0) > 0;
  const hasReplies = (doc.reply_count ?? 0) > 0;
  const attachmentCount = doc.attachments?.length ?? 0;
  const hasMetadata =
    doc.author_name ||
    hasReactions ||
    hasReplies ||
    attachmentCount > 0 ||
    doc.file_size;

  if (!hasMetadata) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 font-mono text-[10px] text-foreground/40">
      {doc.author_name && (
        <span className="max-w-[100px] truncate">{doc.author_name}</span>
      )}
      {hasReactions && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icons.Heart size={10} />
          {doc.reaction_count}
        </span>
      )}
      {hasReplies && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icons.Comment size={10} />
          {doc.reply_count}
        </span>
      )}
      {attachmentCount > 0 && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Icons.Attachment size={10} />
          {attachmentCount}
        </span>
      )}
      {doc.file_size && (
        <span className="text-foreground/30 tabular-nums">
          {formatFileSize(doc.file_size)}
        </span>
      )}
    </div>
  );
}

export function SearchResultRow({
  document: doc,
  isLast,
}: SearchResultRowProps) {
  const showContentPrimary = isContentPrimary(
    doc.connector_type,
    doc.document_type
  );
  const displayTitle = showContentPrimary ? null : doc.file_name || doc.title;
  const contentPreview = getContentPreview(doc.content || "");
  const hasUrl = !!doc.url;

  const content = (
    <>
      <RowIcon doc={doc} />
      <div className="min-w-0 flex-1 space-y-1">
        <RowHeader doc={doc} />
        {displayTitle && (
          <p className="line-clamp-1 text-[13px] text-foreground/90 leading-snug">
            {displayTitle}
          </p>
        )}
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
      {hasUrl && (
        <div className="shrink-0 self-start pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Icons.ExternalLink className="text-foreground/30" size={12} />
        </div>
      )}
    </>
  );

  const baseClassName = cn(
    "group flex w-full items-start gap-3 px-3 py-2.5 transition-colors",
    !isLast && "border-border/40 border-b"
  );

  if (hasUrl) {
    return (
      <button
        className={cn(
          baseClassName,
          "cursor-pointer text-left hover:bg-foreground/2",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/10 focus-visible:ring-inset"
        )}
        onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <div className={baseClassName}>{content}</div>;
}
