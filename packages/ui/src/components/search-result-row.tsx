"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { formatRelativeTime } from "../utils/format";

type SearchResultRowProps = {
  icon?: React.ReactNode;
  typeLabel?: string;
  sourceName?: string | null;
  title?: string | null;
  snippet?: string | null;
  authorName?: string | null;
  authorAvatar?: React.ReactNode;
  updatedAt?: string | null;
  createdAt?: string | null;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
};

function Dot() {
  return <span className="text-foreground/20">{"\u00B7"}</span>;
}

const SearchResultRow = React.forwardRef<
  HTMLButtonElement,
  SearchResultRowProps
>(
  (
    {
      icon,
      typeLabel,
      sourceName,
      title,
      snippet,
      authorName,
      authorAvatar,
      updatedAt,
      createdAt,
      onClick,
      isSelected,
      className,
    },
    ref
  ) => {
    const displayTime = updatedAt ?? createdAt;

    return (
      <button
        className={cn(
          "group flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition-colors",
          "hover:bg-foreground/3",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/10 focus-visible:ring-inset",
          isSelected && "bg-foreground/4",
          className
        )}
        onClick={onClick}
        ref={ref}
        type="button"
      >
        <div className="flex size-7 shrink-0 items-center justify-center bg-foreground/3">
          {icon}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <header className="flex items-center gap-2 font-mono text-[10px]">
            {typeLabel && (
              <span className="text-foreground/40 uppercase tracking-wide">
                {typeLabel}
              </span>
            )}
            {sourceName && (
              <>
                <Dot />
                <span className="text-foreground/50">{sourceName}</span>
              </>
            )}
            {displayTime && (
              <time className="ml-auto text-foreground/30 tabular-nums">
                {formatRelativeTime(displayTime)}
              </time>
            )}
          </header>

          {title && (
            <p className="line-clamp-1 text-[13px] text-foreground/90 leading-snug">
              {title}
            </p>
          )}

          {authorName && (
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/50">
              {authorAvatar}
              <span className="max-w-[120px] truncate">{authorName}</span>
              {displayTime && (
                <>
                  <Dot />
                  <span>Updated {formatRelativeTime(displayTime)}</span>
                </>
              )}
            </div>
          )}

          {snippet && (
            <p
              className={cn(
                "line-clamp-2 text-[12px] leading-relaxed",
                title ? "text-foreground/50" : "text-foreground/80"
              )}
            >
              {snippet}
            </p>
          )}
        </div>
      </button>
    );
  }
);
SearchResultRow.displayName = "SearchResultRow";

export { SearchResultRow };
export type { SearchResultRowProps };
