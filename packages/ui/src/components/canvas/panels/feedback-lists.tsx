"use client";

import { Icons } from "../../icons";

type FeedbackListProps = {
  items: string[];
};

export function WarningsList({ items }: FeedbackListProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2 px-5 pb-4">
      {items.map((warning) => (
        <div
          className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs"
          key={warning}
        >
          <Icons.AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}

export function NotesList({ items }: FeedbackListProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2 px-5 pb-4">
      {items.map((note) => (
        <div
          className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-muted-foreground text-xs"
          key={note}
        >
          <Icons.Info className="mt-0.5 size-3.5 shrink-0" />
          <span>{note}</span>
        </div>
      ))}
    </div>
  );
}
