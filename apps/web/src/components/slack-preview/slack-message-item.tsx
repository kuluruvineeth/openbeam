"use client";

import { SlackContentRenderer } from "@/components/slack-preview/slack-content-renderer";
import { SlackFileList } from "@/components/slack-preview/slack-file-list";
import { SlackReactions } from "@/components/slack-preview/slack-reactions";
import { formatMessageTime } from "@/lib/message-format";
import type {
  SlackFile,
  SlackMessage,
  SlackMetadata,
  SlackReaction,
} from "@/lib/slack-types";
import { cn } from "@/lib/utils";

type SlackMessageItemProps = {
  message: SlackMessage;
  isParent?: boolean;
  onFileClick?: (file: SlackFile) => void;
};

function getInitials(name?: string): string {
  if (!name) {
    return "??";
  }
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function SlackMessageItem({
  message,
  isParent = false,
  onFileClick,
}: SlackMessageItemProps) {
  const metadata = message.metadata as SlackMetadata | undefined;
  const reactions: SlackReaction[] = metadata?.reactions ?? [];
  const files: SlackFile[] = metadata?.files ?? [];

  return (
    <div className={cn("flex items-start gap-3", isParent && "pb-3")}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
          isParent ? "size-9 text-[11px]" : "size-7 text-[10px]"
        )}
      >
        {getInitials(message.authorName)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium text-foreground",
              isParent ? "text-[13px]" : "text-[12px]"
            )}
          >
            {message.authorName || "Unknown"}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatMessageTime(message.createdAt)}
          </span>
        </div>

        <div className="mt-1">
          <SlackContentRenderer
            content={message.content}
            contentHtml={message.contentHtml}
          />
        </div>

        {files.length > 0 && (
          <SlackFileList files={files} onFileClick={onFileClick} />
        )}

        {reactions.length > 0 && <SlackReactions reactions={reactions} />}
      </div>
    </div>
  );
}
