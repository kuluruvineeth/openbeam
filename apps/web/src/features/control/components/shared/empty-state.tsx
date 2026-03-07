"use client";

import { Button } from "@openbeam/ui";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <h3 className="font-medium text-sm">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-muted-foreground text-xs">
          {description}
        </p>
      )}
      {action && (
        <Button
          className="mt-4"
          onClick={action.onClick}
          size="sm"
          variant="outline"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
