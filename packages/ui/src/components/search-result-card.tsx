"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";
import { formatRelativeTime } from "../utils/format";
import { ScoreBadge } from "./score-badge";
import { SourceIcon } from "./source-icon";

const searchResultCardVariants = cva(
  "flex w-full gap-3 border border-border/50 p-3 text-left transition-colors",
  {
    variants: {
      variant: {
        compact: "rounded-sm",
        full: "rounded-md",
      },
      interactive: {
        true: "cursor-pointer hover:bg-muted/50",
        false: "",
      },
      selected: {
        true: "border-primary/30 bg-primary/5 ring-1 ring-primary",
        false: "",
      },
    },
    defaultVariants: {
      variant: "compact",
      interactive: true,
      selected: false,
    },
  }
);

type SearchResultCardProps = React.HTMLAttributes<HTMLButtonElement> &
  Omit<
    VariantProps<typeof searchResultCardVariants>,
    "interactive" | "selected"
  > & {
    id: string;
    title: string;
    snippet?: string;
    connectorType: string;
    documentType?: string;
    url?: string;
    authorName?: string;
    authorAvatarUrl?: string;
    score?: number;
    createdAt?: number | string;
    updatedAt?: number | string;
    sourceName?: string;
    reactionCount?: number;
    replyCount?: number;
    fileSize?: number;
    icon?: React.ReactNode;
    isSelected?: boolean;
    onSelect?: () => void;
    onOpen?: () => void;
  };

const SearchResultCard = React.forwardRef<
  HTMLButtonElement,
  SearchResultCardProps
>(
  (
    {
      className,
      variant,
      id,
      title,
      snippet,
      connectorType,
      documentType,
      url,
      authorName,
      authorAvatarUrl,
      score,
      createdAt,
      updatedAt,
      sourceName,
      reactionCount,
      replyCount,
      fileSize,
      icon,
      isSelected,
      onSelect,
      onOpen,
      ...props
    },
    ref
  ) => {
    const handleClick = React.useCallback(() => {
      if (onOpen) {
        onOpen();
      } else if (onSelect) {
        onSelect();
      } else if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }, [onOpen, onSelect, url]);

    const displayDate = updatedAt ?? createdAt;
    let dateStr: string | null = null;
    if (typeof displayDate === "number") {
      dateStr = new Date(displayDate * 1000).toISOString();
    } else if (typeof displayDate === "string") {
      dateStr = displayDate;
    }

    return (
      <button
        className={cn(
          searchResultCardVariants({
            variant,
            interactive: Boolean(url || onOpen || onSelect),
            selected: isSelected,
          }),
          className
        )}
        onClick={handleClick}
        ref={ref}
        type="button"
        {...props}
      >
        {icon ?? (
          <SourceIcon
            className="mt-0.5 shrink-0"
            size={24}
            type={connectorType}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium text-sm">{title}</span>

          {snippet && (
            <span className="line-clamp-2 text-muted-foreground text-xs">
              {snippet}
            </span>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
              {sourceName ?? connectorType}
            </span>

            {score != null && score > 0 && (
              <ScoreBadge
                score={
                  typeof score === "number" && score <= 1 ? score * 100 : score
                }
              />
            )}

            {authorName && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {authorAvatarUrl ? (
                  <span
                    className="inline-block size-3.5 rounded-full bg-center bg-cover"
                    style={{ backgroundImage: `url(${authorAvatarUrl})` }}
                  />
                ) : null}
                {authorName}
              </span>
            )}

            {replyCount != null && replyCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </span>
            )}

            {dateStr && (
              <span className="text-[10px] text-muted-foreground">
                {formatRelativeTime(dateStr)}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }
);
SearchResultCard.displayName = "SearchResultCard";

export { SearchResultCard, searchResultCardVariants };
export type { SearchResultCardProps };
