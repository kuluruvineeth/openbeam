"use client";

import { cn } from "../../utils/cn";
import type { DocumentCardHeaderProps } from "./types";

function DocumentCardHeader({
  icon,
  title,
  subtitle,
  breadcrumb,
  externalUrl,
  onClose,
  className,
}: DocumentCardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-base">{title}</h3>
            {breadcrumb && (
              <p className="truncate text-muted-foreground text-xs">
                {breadcrumb}
              </p>
            )}
            {subtitle && !breadcrumb && (
              <p className="truncate text-muted-foreground text-xs">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {externalUrl && (
            <a
              className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              href={externalUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="sr-only">Open in source</span>
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
              </svg>
            </a>
          )}
          {onClose && (
            <button
              className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={onClose}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { DocumentCardHeader };
