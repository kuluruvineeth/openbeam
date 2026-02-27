"use client";

import { Button, Skeleton } from "@openplane/ui";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Icons } from "@/components/icons";

type VoiceNoteItemProps = {
  note: {
    id: string;
    text: string;
    audioUrl: string | null;
    duration: number | null;
    tags: string[];
    createdAt: Date;
  };
  onDelete: (noteId: string) => void;
  isDeleting: boolean;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function VoiceNoteItem({
  note,
  onDelete,
  isDeleting,
}: VoiceNoteItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isLongText = note.text.length > 180;
  const displayText =
    expanded || !isLongText ? note.text : `${note.text.slice(0, 180)}...`;

  return (
    <div className="group flex gap-3 border-border/30 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/30">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm bg-muted/60">
        <Icons.Mic className="text-foreground/40" size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground/90 text-sm leading-relaxed">
          {displayText}
          {isLongText && (
            <button
              className="ml-1 text-foreground/40 text-xs hover:text-foreground/60"
              onClick={() => setExpanded(!expanded)}
              type="button"
            >
              {expanded ? "less" : "more"}
            </button>
          )}
        </p>
        <div className="mt-1 flex items-center gap-2 text-foreground/40 text-xs">
          <time dateTime={note.createdAt.toISOString()}>
            {formatDistanceToNow(note.createdAt, { addSuffix: true })}
          </time>
          {note.duration != null && (
            <>
              <span className="text-border">·</span>
              <span>{formatDuration(note.duration)}</span>
            </>
          )}
          {note.tags.length > 0 && (
            <>
              <span className="text-border">·</span>
              <div className="flex gap-1">
                {note.tags.slice(0, 3).map((tag) => (
                  <span
                    className="rounded-sm bg-muted/80 px-1 py-px text-[10px] text-foreground/50"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="text-[10px] text-foreground/30">
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {note.audioUrl && (
          <Button asChild className="size-7" size="icon" variant="ghost">
            <a href={note.audioUrl} rel="noopener noreferrer" target="_blank">
              <Icons.Play size={13} />
            </a>
          </Button>
        )}
        <Button
          className="size-7 text-destructive/70 hover:text-destructive"
          disabled={isDeleting}
          onClick={() => onDelete(note.id)}
          size="icon"
          variant="ghost"
        >
          <Icons.Trash size={13} />
        </Button>
      </div>
    </div>
  );
}

export function VoiceNoteItemSkeleton() {
  return (
    <div className="flex gap-3 px-3 py-2.5">
      <Skeleton className="size-7 shrink-0 rounded-sm" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-0.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}
