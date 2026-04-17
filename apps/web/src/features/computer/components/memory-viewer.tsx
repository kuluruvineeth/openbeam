"use client";

import { Badge, Skeleton } from "@openbeam/ui";
import { cn } from "@openbeam/ui/utils/cn";
import { formatRelativeTime } from "@openbeam/ui/utils/format";
import { useState } from "react";
import { Icons } from "@/components/icons";

interface MemoryEntry {
  id: string;
  key: string;
  content: string;
  type: string | null;
  metadata: Record<string, unknown> | null;
  updatedAt: Date;
}

function MemoryRow({ entry }: { entry: MemoryEntry }) {
  const [expanded, setExpanded] = useState(false);

  let parsedContent: unknown = entry.content;
  let isJson = false;
  try {
    parsedContent = JSON.parse(entry.content);
    isJson = true;
  } catch {
    /* raw text */
  }

  return (
    <div className="border-border/20 border-b last:border-b-0">
      <button
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <Icons.Settings2
          className="shrink-0 text-muted-foreground/40"
          size={14}
        />
        <span className="font-medium">{entry.key}</span>
        {entry.type && (
          <Badge className="px-1.5 py-0 text-[10px]" variant="outline">
            {entry.type}
          </Badge>
        )}
        <span className="ml-auto text-muted-foreground/50">
          {formatRelativeTime(new Date(entry.updatedAt))}
        </span>
        <Icons.ChevronDown
          className={cn(
            "text-muted-foreground/40 transition-transform",
            expanded && "rotate-180"
          )}
          size={12}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <pre
            className={cn(
              "overflow-x-auto rounded-sm bg-muted/50 px-3 py-2 font-mono text-[11px] leading-relaxed",
              !isJson && "whitespace-pre-wrap"
            )}
          >
            {isJson ? JSON.stringify(parsedContent, null, 2) : entry.content}
          </pre>
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(entry.metadata).map(([k, v]) => (
                <Badge
                  className="px-1.5 py-0 text-[10px]"
                  key={k}
                  variant="outline"
                >
                  {k}: {String(v)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MemoryViewer({ entries }: { entries: MemoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-xs">
        No memory entries yet
      </p>
    );
  }

  return (
    <div className="rounded-sm border border-border/30">
      {entries.map((entry) => (
        <MemoryRow entry={entry} key={entry.id} />
      ))}
    </div>
  );
}

export function MemoryViewerSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton className="h-10 w-full" key={`mem-sk-${i.toString()}`} />
      ))}
    </div>
  );
}
