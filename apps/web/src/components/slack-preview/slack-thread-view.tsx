"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import type { SlackFile, SlackMessage } from "@/lib/slack-types";
import { cn } from "@/lib/utils";
import { SlackMessageItem } from "./slack-message-item";

type SlackThreadViewProps = {
  parent: SlackMessage;
  replies: SlackMessage[];
  onFileClick?: (file: SlackFile) => void;
};

export function SlackThreadView({
  parent,
  replies,
  onFileClick,
}: SlackThreadViewProps) {
  const [repliesExpanded, setRepliesExpanded] = useState(true);

  return (
    <div className="p-4">
      <SlackMessageItem isParent message={parent} onFileClick={onFileClick} />

      {replies.length > 0 && (
        <div className="mt-3 border-border/50 border-t pt-3">
          <button
            className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setRepliesExpanded(!repliesExpanded)}
            type="button"
          >
            <Icons.ChevronDown
              className={cn(
                "size-3 transition-transform",
                !repliesExpanded && "-rotate-90"
              )}
            />
            <span className="font-medium">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
          </button>

          {repliesExpanded && (
            <div className="mt-3 space-y-3 border-border/40 border-l-2 pl-4">
              {replies.map((reply) => (
                <SlackMessageItem
                  key={reply.id}
                  message={reply}
                  onFileClick={onFileClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
