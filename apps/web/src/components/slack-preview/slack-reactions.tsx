"use client";

import type { SlackReaction } from "@/lib/slack-types";

type SlackReactionsProps = {
  reactions: SlackReaction[];
};

export function SlackReactions({ reactions }: SlackReactionsProps) {
  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {reactions.map((reaction) => (
        <div
          className="flex items-center gap-1 rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[11px]"
          key={reaction.name}
        >
          <span className="text-foreground/70">{`:${reaction.name}:`}</span>
          <span className="text-muted-foreground tabular-nums">
            {reaction.count}
          </span>
        </div>
      ))}
    </div>
  );
}
