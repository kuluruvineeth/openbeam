"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { EmailPreviewHeader } from "@/components/email-preview/email-preview-header";
import { EmailPreviewLoading } from "@/components/email-preview/email-preview-loading";
import { EmailThreadView } from "@/components/email-preview/email-thread-view";
import type { EmailAttachment, EmailMessage } from "@/lib/email-types";
import { useTRPC } from "@/trpc/client";

type EmailPreviewPanelProps = {
  documentId: string;
  onClose: () => void;
  onAttachmentClick?: (attachmentId: string) => void;
};

export function EmailPreviewPanel({
  documentId,
  onClose,
  onAttachmentClick,
}: EmailPreviewPanelProps) {
  const trpc = useTRPC();

  const { data: document, isLoading: docLoading } = useQuery({
    ...trpc.messages.getDocument.queryOptions({ documentId }),
    staleTime: 5 * 60 * 1000,
  });

  const threadId = document?.threadId ?? documentId;
  const connectorId = document?.connectorId;

  const { data: thread, isLoading: threadLoading } = useQuery({
    ...trpc.messages.getEmailThread.queryOptions({
      threadId,
      connectorId: connectorId ?? "",
    }),
    enabled: !!connectorId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAttachmentClick = useCallback(
    (attachment: EmailAttachment) => {
      onAttachmentClick?.(attachment.id);
    },
    [onAttachmentClick]
  );

  if (docLoading || threadLoading) {
    return <EmailPreviewLoading />;
  }

  if (!thread) {
    return (
      <div className="flex h-full flex-col">
        <EmailPreviewHeader
          messageCount={0}
          onClose={onClose}
          subject="Email not found"
        />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-foreground/50 text-sm">
            Could not load email thread
          </p>
        </div>
      </div>
    );
  }

  const messages: EmailMessage[] = thread.messages.map((msg) => ({
    id: msg.id,
    threadId: msg.threadId,
    title: msg.title,
    content: msg.content,
    contentHtml: msg.contentHtml ?? undefined,
    authorName: msg.authorName ?? undefined,
    authorEmail: msg.authorEmail ?? undefined,
    createdAt: msg.createdAt,
    metadata: msg.metadata as EmailMessage["metadata"],
    url: msg.url ?? undefined,
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <EmailPreviewHeader
        messageCount={thread.messageCount}
        onClose={onClose}
        subject={thread.subject}
        url={thread.url ?? undefined}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <EmailThreadView
          messages={messages}
          onAttachmentClick={handleAttachmentClick}
        />
      </div>
    </div>
  );
}
