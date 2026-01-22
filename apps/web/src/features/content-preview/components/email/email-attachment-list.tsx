"use client";

import { Icons } from "@/components/icons";
import type { EmailAttachment } from "@/lib/email-types";
import { formatFileSize } from "@/lib/format";

type EmailAttachmentListProps = {
  attachments: EmailAttachment[];
  onAttachmentClick?: (attachment: EmailAttachment) => void;
};

export function EmailAttachmentList({
  attachments,
  onAttachmentClick,
}: EmailAttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Email attachments" className="mt-4 space-y-2">
      <span className="text-[11px] text-muted-foreground">
        {attachments.length}{" "}
        {attachments.length === 1 ? "attachment" : "attachments"}
      </span>
      <ul className="flex list-none flex-wrap gap-2">
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <button
              className="flex items-center gap-2 border border-border/50 bg-muted px-2.5 py-1.5 text-left transition-colors hover:bg-muted/80"
              onClick={() => onAttachmentClick?.(attachment)}
              type="button"
            >
              <Icons.Attachment className="size-3 shrink-0 text-muted-foreground" />
              <span className="max-w-[140px] truncate text-[11px] text-foreground">
                {attachment.filename}
              </span>
              {attachment.size && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {formatFileSize(attachment.size)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
