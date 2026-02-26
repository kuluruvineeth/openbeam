"use client";

import { cn } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useMemo } from "react";
import type { DiffLine, DiffSegment } from "../types";

const diffLineVariants = cva(
  "flex min-h-[22px] font-mono text-xs leading-[22px]",
  {
    variants: {
      type: {
        add: "bg-green-500/10",
        remove: "bg-red-500/10",
        context: "bg-transparent",
        header: "bg-accent/30",
      },
    },
    defaultVariants: {
      type: "context",
    },
  }
);

const diffTextVariants = cva("", {
  variants: {
    type: {
      add: "text-green-600 dark:text-green-400",
      remove: "text-red-600 dark:text-red-400",
      context: "text-foreground/70",
      header: "font-medium text-muted-foreground",
    },
  },
});

const diffHighlightVariants = cva("rounded-sm", {
  variants: {
    type: {
      add: "bg-green-500/25",
      remove: "bg-red-500/25",
    },
  },
});

function DiffLineSegments({
  segments,
  lineType,
  prefix,
}: {
  segments: DiffSegment[];
  lineType: "add" | "remove";
  prefix: string;
}) {
  return (
    <span className={diffTextVariants({ type: lineType })}>
      {prefix}
      {segments.map((segment, i) => (
        <span
          className={cn(
            segment.changed && diffHighlightVariants({ type: lineType })
          )}
          key={i}
        >
          {segment.text}
        </span>
      ))}
    </span>
  );
}

function DiffLineRow({ line, index }: { line: DiffLine; index: number }) {
  let prefix = " ";
  if (line.type === "add") {
    prefix = "+";
  } else if (line.type === "remove") {
    prefix = "-";
  }
  const showPrefix = line.type !== "header";

  return (
    <div className={diffLineVariants({ type: line.type })}>
      <span className="inline-block w-8 shrink-0 select-none text-right text-muted-foreground/40 tabular-nums">
        {line.type !== "header" ? index + 1 : ""}
      </span>
      <span className="inline-block w-5 shrink-0 select-none text-center">
        {showPrefix && (
          <span className={diffTextVariants({ type: line.type })}>
            {prefix}
          </span>
        )}
      </span>
      <span className="flex-1 whitespace-pre-wrap break-all pr-3">
        {line.segments && (line.type === "add" || line.type === "remove") ? (
          <DiffLineSegments
            lineType={line.type}
            prefix=""
            segments={line.segments}
          />
        ) : (
          <span className={diffTextVariants({ type: line.type })}>
            {line.content}
          </span>
        )}
      </span>
    </div>
  );
}

interface DiffViewerProps {
  diffLines: DiffLine[];
  maxHeight?: number;
  emptyLabel?: string;
}

export function DiffViewer({
  diffLines,
  maxHeight,
  emptyLabel = "No changes to display",
}: DiffViewerProps) {
  const lineCounter = useMemo(() => {
    let count = 0;
    return diffLines.map((line) => {
      if (line.type === "header") {
        return -1;
      }
      const current = count;
      count += 1;
      return current;
    });
  }, [diffLines]);

  if (diffLines.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className="overflow-auto rounded-sm border border-border/30 bg-background"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className="min-w-0">
        {diffLines.map((line, i) => (
          <DiffLineRow index={lineCounter[i]} key={i} line={line} />
        ))}
      </div>
    </div>
  );
}
