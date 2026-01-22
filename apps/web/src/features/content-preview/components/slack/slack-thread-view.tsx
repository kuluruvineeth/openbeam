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
    <article aria-label="Slack thread" className="p-4">
      <SlackMessageItem isParent message={parent} onFileClick={onFileClick} />

      {replies.length > 0 && (
        <section className="mt-3 border-border/50 border-t pt-3">
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
            <ol
              aria-label="Thread replies"
              className="mt-3 list-none space-y-3 border-border/40 border-l-2 pl-4"
            >
              {replies.map((reply) => (
                <li key={reply.id}>
                  <SlackMessageItem message={reply} onFileClick={onFileClick} />
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </article>
  );
}
