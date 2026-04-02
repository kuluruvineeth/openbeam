import { cn } from "@openbeam/ui/utils";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
};

function DefaultIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground/50"
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
    >
      <path
        d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 py-8 text-center",
        className
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        {icon ?? <DefaultIcon />}
      </div>
      <span className="font-medium text-sm">{title}</span>
      {description && (
        <span className="max-w-xs text-muted-foreground text-xs">
          {description}
        </span>
      )}
    </div>
  );
}
