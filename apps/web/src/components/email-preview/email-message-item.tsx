"use client";

import { useState } from "react";
import { EmailAttachmentList } from "@/components/email-preview/email-attachment-list";
import { EmailContentRenderer } from "@/components/email-preview/email-content-renderer";
import { EmailParticipantList } from "@/components/email-preview/email-participant-list";
import { Icons } from "@/components/icons";
import type {
  EmailAttachment,
  EmailMessage,
  EmailMetadata,
} from "@/lib/email-types";
import { formatMessageTime } from "@/lib/message-format";
import { cn } from "@/lib/utils";

type EmailMessageItemProps = {
  message: EmailMessage;
  isFirst: boolean;
  isLast: boolean;
  defaultExpanded?: boolean;
  onAttachmentClick?: (attachment: EmailAttachment) => void;
};

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

export function EmailMessageItem({
  message,
  isFirst,
  isLast,
  defaultExpanded = false,
  onAttachmentClick,
}: EmailMessageItemProps) {
  const [expanded, setExpanded] = useState(
    defaultExpanded || isFirst || isLast
  );
  const metadata = message.metadata as EmailMetadata | undefined;
  const attachments = metadata?.attachments ?? [];

  return (
    <article
      className={cn(
        "transition-colors",
        !isLast && "border-border/30 border-b"
      )}
    >
      <button
        className="flex w-full items-start gap-3 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div className="flex size-8 shrink-0 items-center justify-center bg-muted font-medium text-[11px] text-muted-foreground">
          {getInitials(message.authorName, message.authorEmail)}
        </div>

        <header className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px]">
              <span className="font-medium text-foreground">
                {message.authorName || "Unknown"}
              </span>
              {message.authorEmail && (
                <span className="ml-1 text-muted-foreground">
                  &lt;{message.authorEmail}&gt;
                </span>
              )}
            </span>
            <time
              className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
              dateTime={new Date(message.createdAt).toISOString()}
            >
              {formatMessageTime(message.createdAt)}
            </time>
            <Icons.ChevronDown
              className={cn(
                "ml-auto shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
              size={14}
            />
          </div>
          {!expanded && message.content && (
            <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
              {message.content.slice(0, 120)}
            </p>
          )}
        </header>
      </button>

      {expanded && (
        <section className="pb-3">
          <div className="pl-11">
            <EmailParticipantList cc={metadata?.cc} to={metadata?.to} />
            <div className="mt-3">
              <EmailContentRenderer
                content={message.content}
                contentHtml={message.contentHtml}
              />
            </div>
            {attachments.length > 0 && (
              <EmailAttachmentList
                attachments={attachments}
                onAttachmentClick={onAttachmentClick}
              />
            )}
          </div>
        </section>
      )}
    </article>
  );
}

export function EmailDateSeparator({ timestamp }: { timestamp: number }) {
  const date = new Date(timestamp);
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-border/50" />
      <span className="text-[11px] text-muted-foreground">{formatted}</span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}
