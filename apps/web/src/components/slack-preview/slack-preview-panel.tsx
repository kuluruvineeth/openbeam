"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { SlackPreviewHeader } from "@/components/slack-preview/slack-preview-header";
import { SlackPreviewLoading } from "@/components/slack-preview/slack-preview-loading";
import { SlackThreadView } from "@/components/slack-preview/slack-thread-view";
import type { SlackFile, SlackMessage, SlackMetadata } from "@/lib/slack-types";
import { useTRPC } from "@/trpc/client";

type SlackPreviewPanelProps = {
  documentId: string;
  onClose: () => void;
  onFileClick?: (fileId: string) => void;
};

export function SlackPreviewPanel({
  documentId,
  onClose,
  onFileClick,
}: SlackPreviewPanelProps) {
  const trpc = useTRPC();

  const { data: document, isLoading: docLoading } = useQuery({
    ...trpc.messages.getDocument.queryOptions({ documentId }),
    staleTime: 5 * 60 * 1000,
  });

  const parentId = document?.parentId ?? documentId;
  const connectorId = document?.connectorId;

  const { data: thread, isLoading: threadLoading } = useQuery({
    ...trpc.messages.getSlackThread.queryOptions({
      parentId,
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

  const handleFileClick = useCallback(
    (file: SlackFile) => {
      onFileClick?.(file.id);
    },
    [onFileClick]
  );

  if (docLoading || threadLoading) {
    return <SlackPreviewLoading />;
  }

  if (!thread) {
    return (
      <div className="flex h-full flex-col">
        <SlackPreviewHeader onClose={onClose} replyCount={0} />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-foreground/50 text-sm">
            Could not load Slack thread
          </p>
        </div>
      </div>
    );
  }

  const parent: SlackMessage = {
    id: thread.parent.id,
    threadId: thread.parent.threadId ?? undefined,
    content: thread.parent.content,
    contentHtml: thread.parent.contentHtml ?? undefined,
    authorName: thread.parent.authorName ?? undefined,
    authorId: thread.parent.authorId ?? undefined,
    createdAt: thread.parent.createdAt,
    replyCount: thread.parent.replyCount ?? undefined,
    reactionCount: thread.parent.reactionCount ?? undefined,
    metadata: thread.parent.metadata as SlackMetadata | undefined,
    url: thread.parent.url ?? undefined,
  };

  const replies: SlackMessage[] = thread.replies.map((reply) => ({
    id: reply.id,
    threadId: reply.threadId ?? undefined,
    content: reply.content,
    contentHtml: reply.contentHtml ?? undefined,
    authorName: reply.authorName ?? undefined,
    authorId: reply.authorId ?? undefined,
    createdAt: reply.createdAt,
    replyCount: reply.replyCount ?? undefined,
    reactionCount: reply.reactionCount ?? undefined,
    metadata: reply.metadata as SlackMetadata | undefined,
    url: reply.url ?? undefined,
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <SlackPreviewHeader
        channelName={thread.channelName ?? undefined}
        onClose={onClose}
        replyCount={thread.replyCount}
        url={thread.url ?? undefined}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <SlackThreadView
          onFileClick={handleFileClick}
          parent={parent}
          replies={replies}
        />
      </div>
    </div>
  );
}
